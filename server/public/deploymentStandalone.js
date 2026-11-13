/* Deployment standalone view. Keep navigation into enhanced pages explicit. */
(function () {
  function projectScope(pathname) {
    const match = pathname.match(
      /^(\/consolev3\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+)\/deployments(?:\/|$)/,
    );
    return match ? match[1] : undefined;
  }

  function enhancedDestination(href, origin, scope) {
    let url;
    try {
      url = new URL(href, origin);
    } catch {
      return undefined;
    }
    if (url.origin !== origin || !url.pathname.startsWith('/consolev3/')) return undefined;
    const deployment =
      url.pathname === scope + '/deployments' || url.pathname.startsWith(scope + '/deployments/');
    const podDetail = url.pathname.startsWith(scope + '/pods/');
    const configReference = /\/deployments\/[^/]+\/config-reference(?:\/|$)/.test(url.pathname);
    if ((deployment || podDetail) && !configReference) return undefined;
    url.pathname = url.pathname.slice('/consolev3'.length);
    return url.href;
  }

  function detailLinks(pathname, origin) {
    const match = pathname.match(
      /^(\/consolev3\/[^/]+\/clusters\/[^/]+\/projects\/[^/]+\/deployments\/[^/]+)(?:\/|$)/,
    );
    if (!match) return undefined;
    const path = match[1].slice('/consolev3'.length);
    return {
      detail: origin + path + '/resource-status',
      config: origin + path + '/config-reference',
    };
  }

  function mount(win) {
    const scope = projectScope(win.location.pathname);
    if (!scope || win.__POWERED_BY_WUJIE__) return false;
    const doc = win.document;
    const language = String(win.globals?.user?.lang || win.navigator.language || 'en');
    const labels = language.startsWith('zh')
      ? { detail: '增强详情', config: '配置引用', back: '返回控制台' }
      : { detail: 'Enhanced details', config: 'Configuration references', back: 'Back to console' };
    const bar = doc.createElement('nav');
    bar.setAttribute('aria-label', 'Deployment');
    bar.setAttribute('data-deployment-standalone-nav', '');
    Object.assign(bar.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 20px',
      background: '#fff',
      borderBottom: '1px solid #e3e9ef',
      fontSize: '12px',
      color: '#242e42',
    });
    const context = doc.createElement('span');
    context.textContent = 'Deployment · ' + scope.split('/').pop();
    const back = doc.createElement('a');
    back.setAttribute('data-standalone-return', '');
    back.href = win.location.origin + scope.slice('/consolev3'.length) + '/deployments';
    back.textContent = labels.back;
    Object.assign(back.style, { color: '#242e42', fontWeight: '600', padding: '4px 12px' });
    bar.append(context, back);
    doc.body.insertBefore(bar, doc.getElementById('root'));
    let scheduled = false;

    function syncLinks() {
      scheduled = false;
      const links = detailLinks(win.location.pathname, win.location.origin);
      const nav = doc.querySelector('.detail-page-nav');
      if (!links || !nav) return;
      const reference = Array.from(nav.querySelectorAll('a[href]')).find(
        anchor =>
          !anchor.hasAttribute('data-standalone-action') &&
          new URL(anchor.href).pathname !== win.location.pathname,
      );
      for (const action of ['detail', 'config']) {
        let anchor = nav.querySelector('[data-standalone-action="' + action + '"]');
        if (!anchor) {
          anchor = doc.createElement('a');
          anchor.setAttribute('data-standalone-action', action);
          anchor.className = reference?.className || '';
          anchor.textContent = labels[action];
          nav.appendChild(anchor);
        }
        anchor.href = links[action];
      }
    }

    function scheduleLinks() {
      if (scheduled) return;
      scheduled = true;
      win.requestAnimationFrame(syncLinks);
    }

    // Keep the V3 Deployment/Pod chain in its current document. Other menu
    // destinations enter the host with the same cluster and namespace path.
    doc.addEventListener(
      'click',
      event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
          return;
        const anchor = event.target?.closest?.('a[href]');
        const target = anchor && enhancedDestination(anchor.href, win.location.origin, scope);
        if (!target) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        win.location.assign(target);
      },
      true,
    );

    for (const method of ['pushState', 'replaceState']) {
      const original = win.history[method];
      win.history[method] = function (...args) {
        const href = args[2] == null ? win.location.href : new URL(args[2], win.location.href).href;
        const target = enhancedDestination(href, win.location.origin, scope);
        if (target) {
          if (method === 'replaceState') win.location.replace(target);
          else win.location.assign(target);
          return;
        }
        const result = original.apply(this, args);
        scheduleLinks();
        return result;
      };
    }
    win.addEventListener('popstate', () => {
      const target = enhancedDestination(win.location.href, win.location.origin, scope);
      if (target) win.location.replace(target);
      else scheduleLinks();
    });
    new win.MutationObserver(scheduleLinks).observe(doc.documentElement, {
      childList: true,
      subtree: true,
    });
    scheduleLinks();
    return true;
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { projectScope, enhancedDestination, detailLinks, mount };
  } else {
    mount(window);
  }
})();
