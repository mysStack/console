import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const requireFromSource = createRequire(join(__dirname, 'wujie.ts'));

function fixture(globals: Record<string, any>) {
  const setups: any[] = [];
  const preloads: any[] = [];
  const emitted: any[] = [];
  const listeners = new Map<string, (name: string) => void>();
  let completed = false;
  const wujie = {
    setupApp: (options: any) => setups.push(options),
    preloadApp: (options: any) => preloads.push(options),
    bus: {
      $on: (event: string, listener: (name: string) => void) => listeners.set(event, listener),
    },
  };
  const ts = requireFromSource('typescript');
  const code = ts.transpileModule(readFileSync(join(__dirname, 'wujie.ts'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    globals,
    window: { globals, location: { host: 'console.test:30881' } },
    require: (id: string) => {
      if (id === 'wujie-react') return wujie;
      if (id === '@ks-console/shared')
        return { useEventEmitter: () => ({ $emit: (...args: any[]) => emitted.push(args) }) };
      if (id === '../utils/globals.consoleV3LoadCompleted')
        return {
          setGlobalConsoleV3LoadCompleted: ({ value }: { value: boolean }) => {
            completed = value;
          },
        };
      return requireFromSource(id);
    },
  });
  module.exports.initWujie();
  return { setups, preloads, emitted, listeners, completed: () => completed };
}

test('anonymous login pages register applications without fetching protected V3 pages', () => {
  const f = fixture({ config: {} });
  assert.equal(f.setups.length, 2);
  assert.equal(f.preloads.length, 0);
});

test('a confirmation page with a partial user does not start protected V3 preload', () => {
  const f = fixture({ user: { username: 'fixture-user' }, config: {} });
  assert.equal(f.preloads.length, 0);
});

test('authenticated console pages preload the list and action applications', () => {
  const f = fixture({ user: { username: 'fixture-user' }, ksConfig: {} });
  assert.deepEqual(
    f.preloads.map(options => options.name),
    ['consoleV3Actions', 'consolev3'],
  );
  for (const options of f.preloads)
    assert.equal(options.url, '//console.test:30881/consolev3/dashboard');
  assert.equal(f.preloads[0].props.actions, true);
});

test('registered application lifecycle and action readiness callbacks stay available', () => {
  const f = fixture({ user: { username: 'fixture-user' }, ksConfig: {} });
  const appWindow = {};
  f.setups[0].afterMount(appWindow);
  f.setups[0].afterUnmount(appWindow);
  assert.deepEqual(
    f.emitted.map(args => args[0]),
    ['afterMountConsoleV3', 'afterUnmountConsoleV3'],
  );
  assert.equal(f.emitted[0][1], appWindow);
  f.setups[1].afterMount();
  f.listeners.get('loadCompleted')?.('consolev3');
  assert.equal(f.completed(), true);
});
