import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const sourceRequire = createRequire(join(__dirname, 'getExtensionConsoleV3Embed.tsx'));
function fixture() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const setups: any[] = [],
    events: any[] = [],
    cleanups: any[] = [],
    requests: any[] = [],
    destroyed: string[] = [];
  const timers = new Set<() => void>();
  let mounted = false,
    first = true,
    failManifest = false;
  const location = {
    origin: 'http://console.test',
    pathname: '/clusters/host/alert-rules',
    search: '',
  };
  const component: any = () => null;
  component.setupApp = (options: any) => setups.push(options);
  component.destroyApp = (name: string) => destroyed.push(name);
  component.bus = {
    $on(name: string, fn: any) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    $off(name: string, fn: any) {
      listeners.get(name)?.delete(fn);
    },
    $emit(name: string, ...args: any[]) {
      events.push([name, ...args]);
      for (const fn of listeners.get(name) || []) fn(...args);
    },
  };
  const react = {
    createElement: (type: any, props: any) => ({ type, props }),
    useState: () => [
      mounted,
      (next: boolean) => {
        mounted = next;
      },
    ],
    useEffect: (effect: any) => {
      if (first) cleanups.push(effect());
    },
  };
  const ts = sourceRequire('typescript');
  const code = ts.transpileModule(
    readFileSync(join(__dirname, 'getExtensionConsoleV3Embed.tsx'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} as any };
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    URL,
    Response,
    globals: { user: { username: 'fixture' }, config: {}, ksConfig: {} },
    t: (key: string) => key,
    window: {
      location,
      fetch: async (url: string, options: any) => {
        requests.push({ url, options });
        if (failManifest) return new Response('', { status: 503 });
        return Response.json(
          url.endsWith('manifest.locale.json')
            ? {}
            : { entrypoints: { main: { js: ['main.js'] } } },
        );
      },
    },
    setTimeout: (fn: () => void) => {
      timers.add(fn);
      return fn;
    },
    clearTimeout: (fn: () => void) => timers.delete(fn),
    require(id: string) {
      if (id === 'react') return react;
      if (id.includes('/ConsoleV3Embed')) return { __esModule: true, default: component };
      if (id === '@kubed/components')
        return { notify: { error: () => events.push(['notify-error']) } };
      return sourceRequire(id);
    },
  });
  const sdk = loaded.exports.getExtensionConsoleV3Embed({
    name: 'wiz-console-v3',
    baseUrl: '//console.test/wiz/consolev3',
  });
  return {
    sdk,
    setups,
    events,
    requests,
    destroyed,
    location,
    timers,
    ready: (name = 'wiz-console-v3-actions') => component.bus.$emit('loadCompleted', name),
    render: () => {
      const node = sdk.V3ModalObserver();
      first = false;
      return node;
    },
    dispose: () => cleanups.forEach(fn => fn?.()),
    failManifest: (value: boolean) => {
      failManifest = value;
    },
  };
}

test('registration is idempotent and starts no extension V3 download at login', () => {
  const f = fixture();
  f.sdk.initWujie();
  f.sdk.initWujie();
  assert.equal(f.setups.length, 2);
  assert.equal(f.requests.length, 0);
  assert.deepEqual(
    f.setups.map(x => x.name),
    ['wiz-console-v3', 'wiz-console-v3-actions'],
  );
});

test('pages use extension assets and retry a failed manifest instead of rendering the host', async () => {
  const f = fixture();
  const page = f.sdk.ExtensionConsoleV3Embed({ path: '/clusters/host/monitor-cluster' });
  assert.equal(page.props.url, 'http://console.test/wiz/consolev3/clusters/host/monitor-cluster');
  assert.equal(page.props.props.actions, false);
  f.failManifest(true);
  await assert.rejects(page.props.fetch(page.props.url), /503/);
  f.failManifest(false);
  const response = await page.props.fetch(page.props.url);
  assert.match(await response.text(), /\/extensions-static\/wiz\/dist\/v3dist\/main.js/);
  assert.ok(f.requests.every(x => x.options.credentials === 'same-origin'));
});

test('actions wait for their own registry and dispatch once on the namespaced bus', () => {
  const f = fixture();
  assert.equal(f.render(), null);
  f.sdk.triggerV3Action({ action: 'alerting.policy.create', cluster: 'host' });
  f.sdk.triggerV3Action({ action: 'duplicate' });
  assert.equal(f.render().props.name, 'wiz-console-v3-actions');
  f.ready('consolev3');
  assert.equal(f.events.filter(x => x[0] === 'wiz-console-v3-triggerAction').length, 0);
  f.ready();
  f.ready();
  const events = f.events.filter(x => x[0] === 'wiz-console-v3-triggerAction');
  assert.equal(events.length, 1);
  assert.equal(events[0][1], 'alerting.policy.create');
  assert.equal(events[0][2].cluster, 'host');
  assert.equal(f.timers.size, 0);
});

test('scope changes and observer cleanup cancel queued actions and remove subscriptions', () => {
  const f = fixture();
  f.render();
  let cancelled = 0;
  f.sdk.triggerV3Action({ action: 'edit', onCancel: () => cancelled++ });
  f.location.pathname = '/clusters/other/alert-rules';
  f.ready();
  assert.equal(cancelled, 1);
  assert.equal(f.events.filter(x => x[0] === 'wiz-console-v3-triggerAction').length, 0);
  f.dispose();
  assert.deepEqual(f.destroyed, ['wiz-console-v3-actions']);
  assert.equal(f.timers.size, 0);
});

test('timeout reports initialization failure once and prevents a late write', () => {
  const f = fixture();
  f.render();
  f.sdk.triggerV3Action({ action: 'edit' });
  [...f.timers][0]();
  f.ready();
  assert.equal(f.events.filter(x => x[0] === 'notify-error').length, 1);
  assert.equal(f.events.filter(x => x[0] === 'wiz-console-v3-triggerAction').length, 0);
});
