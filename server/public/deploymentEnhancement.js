/* Standalone Deployment enhancement lifecycle. Resource writes stay in the existing panel. */
(function () {
  function resourceContext(pathname) {
    const match = pathname.match(
      /^(\/consolev3\/([^/]+)\/clusters\/([^/]+)\/projects\/([^/]+))\/deployments\/([^/]+)(?:\/|$)/,
    );
    if (!match) return null;
    try {
      return {
        list: match[1] + '/deployments',
        workspace: decodeURIComponent(match[2]),
        cluster: decodeURIComponent(match[3]),
        namespace: decodeURIComponent(match[4]),
        name: decodeURIComponent(match[5]),
      };
    } catch {
      return null;
    }
  }
  function isDeploymentRead(context, pathname) {
    const base = '/clusters/' + encodeURIComponent(context.cluster);
    const tail = '/namespaces/' + encodeURIComponent(context.namespace) + '/deployments';
    for (const api of ['/apis/apps/v1', '/kapis/resources.kubesphere.io/v1alpha3']) {
      if (pathname === base + api + tail) return 'list';
      if (pathname === base + api + tail + '/' + encodeURIComponent(context.name)) return 'detail';
    }
    return null;
  }
  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map(key => [key, canonical(value[key])]),
      );
    return value;
  }
  function referenceSnapshot(resource) {
    const source = resource?._originData || resource;
    const spec = source?.spec?.template?.spec || {};
    const containers = (spec.containers || [])
      .map(item => ({
        name: item.name,
        envFrom: item.envFrom || [],
        volumeMounts: item.volumeMounts || [],
      }))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    const volumes = [...(spec.volumes || [])].sort((a, b) =>
      String(a.name).localeCompare(String(b.name)),
    );
    return JSON.stringify(
      canonical({
        containers,
        volumes,
        reloader: source?.metadata?.annotations?.['reloader.stakater.com/auto'] || null,
      }),
    );
  }
  function applySavePatch(resource, patch) {
    const result = JSON.parse(JSON.stringify(resource));
    for (const operation of patch) {
      const parts = operation.path
        .split('/')
        .slice(1)
        .map(part => part.replace(/~1/g, '/').replace(/~0/g, '~'));
      if (parts.some(part => ['__proto__', 'prototype', 'constructor'].includes(part)))
        throw Error('Invalid save pointer');
      if (operation.op === 'test') {
        if (
          operation.path !== '/metadata/resourceVersion' ||
          result.metadata?.resourceVersion !== operation.value
        )
          throw Error('Resource version changed');
        continue;
      }
      if (!['add', 'remove', 'replace'].includes(operation.op))
        throw Error('Invalid save operation');
      let parent = result;
      for (const part of parts.slice(0, -1)) {
        parent = parent?.[part];
        if (!parent || typeof parent !== 'object') throw Error('Invalid save pointer');
      }
      const key = parts[parts.length - 1];
      if (operation.op === 'remove') {
        if (Array.isArray(parent)) parent.splice(Number(key), 1);
        else delete parent[key];
      } else if (Array.isArray(parent) && operation.op === 'add') {
        parent.splice(key === '-' ? parent.length : Number(key), 0, operation.value);
      } else parent[key] = operation.value;
    }
    return result;
  }
  function mount(win) {
    if (
      win.top !== win ||
      win.__POWERED_BY_WUJIE__ ||
      !win.globals?.consoleEntry?.enhancement ||
      !win.location.pathname.startsWith('/consolev3/')
    )
      return false;
    const doc = win.document;
    const root = doc.getElementById('root');
    const zh = String(win.globals.user?.lang || win.navigator.language).startsWith('zh');
    const labels = zh
      ? {
          title: '配置引用',
          close: '关闭配置引用',
          loading: '正在加载配置引用…',
          retry: '重试加载',
          failure: '配置引用加载失败',
          refreshing: '正在读取最新资源…',
          reload: '重新加载页面',
          refreshFailed: '资源刷新未完成，请重新加载页面后继续编辑',
          saving: '正在保存，完成后关闭',
          uncertain: '提交结果待确认，关闭时将读取最新资源',
          changed: '资源已变化，请重新加载页面后核对',
        }
      : {
          title: 'Configuration references',
          close: 'Close configuration references',
          loading: 'Loading configuration references…',
          retry: 'Retry loading',
          failure: 'Configuration references could not load',
          refreshing: 'Reading the latest resource…',
          reload: 'Reload page',
          refreshFailed: 'Resource refresh did not finish. Reload before editing.',
          saving: 'Saving; close after completion',
          uncertain: 'Submission outcome is unknown. Closing will read the latest resource.',
          changed: 'Resource changed. Reload and review it.',
        };
    const state = {
      opened: 0,
      closed: 0,
      loaded: 0,
      pendingWrites: 0,
      refreshes: 0,
      authRedirects: 0,
      phase: 'closed',
    };
    let frame, protocol, shell, status, retry, dismiss, loadingTimer;
    let context,
      active = false,
      closing = false,
      closeRequested = false,
      dirty = false,
      uncertain = false;
    let session = 0,
      mountedSession = 0,
      principalAccepted = false;
    let previousFocus, previousScroll, previousOverflow;
    let expectedReferences, resourceUid, listUrl;
    let readSequence = 0;
    const background = new Map();
    const waiters = new Set();
    const key = value =>
      value && [value.workspace, value.cluster, value.namespace, value.name].join('/');
    const wanted = () =>
      new URL(win.location.href).searchParams.get('enhancement') === 'config-reference';
    const paint = () =>
      new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)));
    function replaceRoute(value) {
      win.history.replaceState(win.history.state, '', value);
      win.dispatchEvent(new win.PopStateEvent('popstate', { state: win.history.state }));
    }
    function currentUrl() {
      return win.location.pathname + win.location.search + win.location.hash;
    }
    function reportRead(read) {
      for (const waiter of [...waiters]) {
        if (
          read.sequence <= waiter.after ||
          isDeploymentRead(waiter.context, read.path) !== waiter.kind
        )
          continue;
        waiters.delete(waiter);
        win.clearTimeout(waiter.timer);
        if (read.status === 200) waiter.resolve(read.resource);
        else waiter.reject(Error('Resource refresh failed'));
      }
    }
    const originalFetch = win.fetch;
    win.fetch = async function (input, options) {
      const path = new URL(input?.url || input, win.location.href).pathname;
      const method = String(options?.method || input?.method || 'GET').toUpperCase();
      const sequence = method === 'GET' && path.includes('/deployments') ? ++readSequence : 0;
      const response = await originalFetch.call(this, input, options);
      if (sequence)
        response
          .clone()
          .json()
          .then(resource => reportRead({ sequence, path, status: response.status, resource }))
          .catch(() => {});
      return response;
    };
    const originalOpen = win.XMLHttpRequest.prototype.open;
    win.XMLHttpRequest.prototype.open = function (method, url, ...args) {
      if (String(method).toUpperCase() === 'GET') {
        const path = new URL(url, win.location.href).pathname;
        if (path.includes('/deployments')) {
          const sequence = ++readSequence;
          this.addEventListener(
            'loadend',
            () => {
              let resource;
              try {
                resource =
                  this.responseType === 'json' ? this.response : JSON.parse(this.responseText);
              } catch {}
              reportRead({ sequence, path, status: this.status, resource });
            },
            { once: true },
          );
        }
      }
      return originalOpen.call(this, method, url, ...args);
    };
    function waitForRead(params, kind, navigate) {
      return new Promise((resolve, reject) => {
        const waiter = { context: params, kind, after: readSequence, resolve, reject };
        waiter.timer = win.setTimeout(() => {
          waiters.delete(waiter);
          reject(Error('Resource refresh timed out'));
        }, 12000);
        waiters.add(waiter);
        try {
          navigate();
        } catch (error) {
          waiters.delete(waiter);
          win.clearTimeout(waiter.timer);
          reject(error);
        }
      });
    }
    function setBackgroundInert() {
      for (const element of doc.body.children) {
        if (element === shell || background.has(element)) continue;
        background.set(element, element.inert);
        element.inert = true;
      }
    }
    function failLoad() {
      if (!active) return;
      state.phase = 'load-error';
      status.textContent = labels.failure;
      retry.textContent = labels.retry;
      retry.onclick = createFrame;
      retry.hidden = false;
      dismiss.disabled = false;
      if (frame) frame.hidden = true;
    }
    function ensureShell() {
      if (shell) return;
      shell = doc.createElement('section');
      shell.setAttribute('data-enhancement-shell', '');
      shell.setAttribute('role', 'dialog');
      shell.setAttribute('aria-modal', 'true');
      shell.setAttribute('aria-label', labels.title);
      Object.assign(shell.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '100000',
        background: '#f9fbfd',
        display: 'none',
      });
      const toolbar = doc.createElement('div');
      Object.assign(toolbar.style, {
        minHeight: '44px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '8px 20px',
      });
      status = doc.createElement('span');
      status.setAttribute('data-enhancement-status', '');
      status.setAttribute('role', 'status');
      retry = doc.createElement('button');
      retry.type = 'button';
      retry.textContent = labels.retry;
      retry.hidden = true;
      dismiss = doc.createElement('button');
      dismiss.type = 'button';
      dismiss.textContent = labels.close;
      dismiss.onclick = () => controller.close();
      toolbar.append(status, retry, dismiss);
      shell.append(toolbar);
      doc.body.append(shell);
    }
    function bootstrapGlobals() {
      const user = win.globals.user;
      return {
        ...win.globals,
        user: {
          ...user,
          projectRules: {
            [context.cluster]: {
              [context.namespace]: user.projectRules?.[context.cluster]?.[context.namespace],
            },
          },
          clusterRules: { [context.cluster]: user.clusterRules?.[context.cluster] },
        },
      };
    }
    function mountModule() {
      if (!active || !protocol || mountedSession === session) return;
      mountedSession = session;
      state.phase = 'open';
      status.textContent = '';
      frame.hidden = false;
      const id = session;
      protocol.mount({
        sessionId: id,
        globals: bootstrapGlobals(),
        resource: { ...context },
        onClose: () => {
          if (id === session) controller.close();
        },
        onWriteStart: submission => {
          if (id !== session || !active || closing || state.pendingWrites) return false;
          expectedReferences = referenceSnapshot(
            applySavePatch(submission.resource, submission.patch),
          );
          resourceUid = submission.resource.metadata?.uid;
          dirty = true;
          state.pendingWrites = 1;
          state.phase = 'saving';
          dismiss.disabled = true;
          return true;
        },
        onWriteResult: result => {
          if (id !== session || !active) return;
          state.pendingWrites = 0;
          dismiss.disabled = false;
          state.phase = 'open';
          if (result.outcome === 'saved') {
            resourceUid = result.resource?.metadata?.uid || resourceUid;
            if (result.resource?.spec) expectedReferences = referenceSnapshot(result.resource);
            uncertain = false;
            if (closeRequested || !wanted()) controller.close();
            return;
          }
          uncertain = result.outcome === 'unknown';
          if (result.outcome === 'rejected') expectedReferences = null;
          status.textContent = uncertain ? labels.uncertain : '';
          closeRequested = false;
          restoreEnhancementUrl();
        },
      });
    }
    async function openRetainedModule(id) {
      try {
        const response = await originalFetch.call(win, '/console-entry/session', {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        if (response.status === 401) {
          controller.unauthorized();
          return;
        }
        if (!response.ok) throw Error('Session validation failed');
        const identity = await response.json();
        if (identity.username !== win.globals.user.username) {
          win.location.reload();
          return;
        }
        if (active && session === id) mountModule();
      } catch {
        if (active && session === id) failLoad();
      }
    }
    function createFrame() {
      win.clearTimeout(loadingTimer);
      if (protocol) protocol.unmount();
      protocol = null;
      mountedSession = 0;
      principalAccepted = false;
      frame?.remove();
      const created = doc.createElement('iframe');
      frame = created;
      frame.setAttribute('data-native-enhancement', '');
      frame.title = labels.title;
      Object.assign(frame.style, { width: '100%', height: 'calc(100% - 60px)', border: '0' });
      frame.hidden = true;
      status.textContent = labels.loading;
      retry.hidden = true;
      state.phase = 'loading';
      frame.addEventListener('load', () => {
        if (frame !== created) return;
        try {
          if (/^\/(login|logout)(\/|$)/.test(frame.contentWindow.location.pathname)) {
            controller.unauthorized();
            return;
          }
        } catch {
          failLoad();
          return;
        }
        if (!protocol) failLoad();
      });
      loadingTimer = win.setTimeout(() => {
        if (frame === created && !protocol) failLoad();
      }, 15000);
      frame.src = '/console-entry/config-reference';
      shell.append(frame);
    }
    function restoreEnhancementUrl() {
      if (wanted() && key(resourceContext(win.location.pathname)) === key(context)) return;
      const destination = new URL(context.detail, win.location.origin);
      destination.searchParams.set('enhancement', 'config-reference');
      replaceRoute(destination.pathname + destination.search + destination.hash);
    }
    async function refreshNative() {
      const destination = new URL(context.detail, win.location.origin);
      destination.searchParams.delete('enhancement');
      state.phase = 'refreshing';
      status.textContent = labels.refreshing;
      dismiss.disabled = true;
      frame.hidden = true;
      await waitForRead(context, 'list', () => replaceRoute(listUrl || context.list));
      await paint();
      const resource = await waitForRead(context, 'detail', () =>
        replaceRoute(destination.pathname + destination.search + destination.hash),
      );
      const source = resource?._originData || resource;
      if (!source?.metadata?.uid || (resourceUid && source.metadata.uid !== resourceUid))
        throw Error(labels.changed);
      if (expectedReferences && referenceSnapshot(source) !== expectedReferences)
        throw Error(uncertain ? labels.uncertain : labels.changed);
      await paint();
      state.refreshes += 1;
    }
    async function deactivate() {
      if (!active || closing) return;
      if (state.pendingWrites) {
        closeRequested = true;
        status.textContent = labels.saving;
        return;
      }
      closing = true;
      try {
        if (dirty) await refreshNative();
      } catch (error) {
        state.phase = 'refresh-error';
        status.textContent = error.message || labels.refreshFailed;
        retry.textContent = labels.reload;
        retry.onclick = () => win.location.reload();
        retry.hidden = false;
        dismiss.disabled = true;
        closing = false;
        return;
      }
      protocol?.unmount();
      mountedSession = 0;
      active = false;
      dirty = false;
      uncertain = false;
      closing = false;
      closeRequested = false;
      shell.style.display = 'none';
      if (frame) frame.hidden = true;
      for (const [element, inert] of background) if (element.isConnected) element.inert = inert;
      background.clear();
      doc.body.style.overflow = previousOverflow;
      win.scrollTo(previousScroll.x, previousScroll.y);
      const focus = previousFocus?.isConnected
        ? previousFocus
        : doc.querySelector('[data-standalone-action="config"]');
      focus?.focus();
      state.closed += 1;
      state.phase = 'closed';
    }
    function synchronize() {
      if (closing || state.phase === 'refresh-error') return;
      const params = resourceContext(win.location.pathname);
      if (!wanted() || !params) {
        deactivate();
        return;
      }
      if (active) {
        if (key(params) !== key(context)) {
          controller.close();
        }
        return;
      }
      if (
        !doc.querySelector('.detail-page-nav') ||
        !win.globals.user?.projectRules?.[params.cluster]?.[params.namespace]
      )
        return;
      ensureShell();
      context = { ...params, detail: currentUrl() };
      session += 1;
      active = true;
      previousFocus = doc.activeElement;
      previousScroll = { x: win.scrollX, y: win.scrollY };
      previousOverflow = doc.body.style.overflow;
      doc.body.style.overflow = 'hidden';
      shell.style.display = '';
      setBackgroundInert();
      dismiss.disabled = false;
      dismiss.focus();
      retry.hidden = true;
      status.textContent = labels.loading;
      state.opened += 1;
      if (!frame || !protocol) createFrame();
      else openRetainedModule(session);
    }
    function focusable(document) {
      return Array.from(
        document.querySelectorAll(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]',
        ),
      ).filter(element => !element.hidden && element.getBoundingClientRect().width > 0);
    }
    function handleKeydown(event) {
      if (!active) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        controller.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const nodes = [retry, dismiss].filter(element => !element.hidden && !element.disabled);
      if (frame && !frame.hidden) {
        try {
          nodes.push(...focusable(frame.contentDocument));
        } catch {}
      }
      if (!nodes.length) return;
      const index = nodes.indexOf(event.target);
      if (event.shiftKey && index <= 0) {
        event.preventDefault();
        nodes[nodes.length - 1].focus();
      } else if (!event.shiftKey && index === nodes.length - 1) {
        event.preventDefault();
        nodes[0].focus();
      }
    }
    const controller = {
      state,
      bootstrap(child, username) {
        if (child !== frame?.contentWindow || !context) return null;
        if (username !== win.globals.user?.username) {
          win.location.reload();
          return null;
        }
        principalAccepted = true;
        return bootstrapGlobals();
      },
      moduleReady(child, module) {
        if (child !== frame?.contentWindow || !principalAccepted || module?.version !== 1)
          return false;
        protocol = module;
        state.loaded += 1;
        win.clearTimeout(loadingTimer);
        mountModule();
        return true;
      },
      handleFrameKeydown(child, event) {
        if (child === frame?.contentWindow) handleKeydown(event);
      },
      close() {
        if (!active || state.phase === 'refresh-error') return;
        if (state.pendingWrites) {
          closeRequested = true;
          status.textContent = labels.saving;
          return;
        }
        closeRequested = true;
        if (wanted()) {
          const url = new URL(win.location.href);
          url.searchParams.delete('enhancement');
          if (win.history.state?.consoleEnhancementEntry) win.history.back();
          else {
            replaceRoute(url.pathname + url.search + url.hash);
            deactivate();
          }
        } else deactivate();
      },
      unauthorized() {
        if (state.authRedirects) return;
        state.authRedirects += 1;
        session += 1;
        active = false;
        state.pendingWrites = 0;
        protocol?.unmount();
        win.location.assign('/logout');
      },
    };
    win.__deploymentEnhancement = controller;
    doc.addEventListener(
      'click',
      event => {
        if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        const anchor = event.target?.closest?.('[data-standalone-action="config"]');
        if (!anchor) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (active || closing || !resourceContext(win.location.pathname)) return;
        const url = new URL(win.location.href);
        url.searchParams.set('enhancement', 'config-reference');
        win.history.pushState({ ...win.history.state, consoleEnhancementEntry: true }, '', url);
        synchronize();
      },
      true,
    );
    doc.addEventListener('keydown', handleKeydown, true);
    win.addEventListener('popstate', synchronize);
    const originalPush = win.history.pushState;
    win.history.pushState = function (...args) {
      if (/\/deployments$/.test(win.location.pathname)) listUrl = currentUrl();
      return originalPush.apply(this, args);
    };
    let scheduled = false;
    new win.MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      win.requestAnimationFrame(() => {
        scheduled = false;
        if (active) setBackgroundInert();
        synchronize();
      });
    }).observe(doc.documentElement, { childList: true, subtree: true });
    synchronize();
    return true;
  }
  if (typeof module === 'object' && module.exports)
    module.exports = {
      resourceContext,
      isDeploymentRead,
      referenceSnapshot,
      applySavePatch,
      mount,
    };
  else mount(window);
})();
