import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
const requireFromSource = createRequire(join(__dirname, 'request.ts'));

function loadRequest() {
  let rejected: (error: unknown) => Promise<never>;
  const redirects: string[] = [];
  const emitted: unknown[] = [];
  const instance = {
    interceptors: {
      request: { use() {} },
      response: {
        use(_success: unknown, failure: typeof rejected) {
          rejected = failure;
        },
      },
    },
  };
  const ts = requireFromSource('typescript');
  const code = ts.transpileModule(readFileSync(join(__dirname, 'request.ts'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2019,
    },
  }).outputText;
  const module = { exports: {} as any };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    window: { location: { assign: (url: string) => redirects.push(url) } },
    console: { warn() {} },
    require: (name: string) => {
      if (name === 'axios') return { __esModule: true, default: instance };
      if (name === '../hooks/useEventEmitter')
        return { useEventEmitter: () => ({ $emit: (...args: unknown[]) => emitted.push(args) }) };
      return requireFromSource(name);
    },
  });
  return { api: module.exports, reject: (error: unknown) => rejected(error), redirects, emitted };
}

test('aborted and failed reads reject the original error without a secondary response access error', async () => {
  const f = loadRequest();
  const error = { code: 'ERR_CANCELED' };
  await assert.rejects(f.reject(error), value => value === error);
  assert.equal(f.redirects.length, 0);
  assert.equal(f.emitted.length, 0);
});

test('an isolated enhancement sends unauthorized navigation to its top-level owner once', async () => {
  const f = loadRequest();
  const top: string[] = [];
  f.api.configureUnauthorizedNavigation((url: string) => top.push(url));
  const error = {
    response: {
      status: 401,
      config: { url: '/clusters/host/apis/apps/v1/namespaces/ns/deployments/app' },
    },
  };
  await assert.rejects(f.reject(error));
  await assert.rejects(f.reject(error));
  assert.deepEqual(top, ['/logout']);
  assert.deepEqual(f.redirects, []);
});
