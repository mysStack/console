import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('ConsoleV3AliveEmbed keeps the shared consolev3 sandbox alive', () => {
  assert.match(source, /name="consolev3"/);
  assert.match(source, /\balive\b/);
  assert.match(source, /watchConsoleV3Sandbox/);
  assert.match(source, /scheduleConsoleV3ListRouteSync/);
});

test('ConsoleV3AliveEmbed runs afterUnmount on deactivated and React unmount', () => {
  // alive embeds never fire wujie's afterUnmount; cleanup must use deactivated.
  assert.match(source, /deactivated=\{appWindow => \{/);
  assert.match(source, /afterUnmount\?\.\(appWindow\)/);
  assert.match(source, /afterUnmountRef\.current\?\.\(\)/);
});

import ts from 'typescript';
import vm from 'node:vm';

test('a detail-owned route is not overwritten by the generic activation callback', () => {
  const scheduled: unknown[][] = [];
  const react = {
    createElement: (_type: unknown, props: unknown) => props,
    useCallback: (callback: unknown) => callback,
    useEffect: () => undefined,
    useRef: (value: unknown) => ({ current: value }),
  };
  const module = { exports: {} as any };
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      esModuleInterop: true,
    },
  }).outputText;
  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    require(request: string) {
      if (request === 'react') return react;
      if (request === 'wujie-react' || request.includes('/ConsoleV3Embed')) return {};
      if (request.endsWith('/keepAlive')) return { watchConsoleV3Sandbox: () => undefined };
      if (request.endsWith('/route'))
        return { scheduleConsoleV3ListRouteSync: (...args: unknown[]) => scheduled.push(args) };
      throw new Error('Unexpected dependency ' + request);
    },
  });
  const child = { location: { pathname: '/detail' } };
  const Embed = module.exports.default;
  const detail = Embed({ url: '/list', synchronizeRoute: false });
  detail.afterMount(child);
  detail.activated(child);
  assert.equal(scheduled.length, 0);
  const list = Embed({ url: '/list' });
  list.activated(child);
  assert.equal(scheduled.length, 1);
  assert.equal(scheduled[0][0], child);
  assert.equal(scheduled[0][1], '/list');
});
