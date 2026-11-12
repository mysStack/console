import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const requireFromSource = createRequire(join(__dirname, 'i18n.ts'));

async function fixture(t: any) {
  const paths: string[] = [];
  const failures = new Set<string>();
  const bundles: Record<string, Record<string, string>> = {
    '/dist/zh.1.json': { HELLO: '你好', OLD: '旧键' },
    '/dist/zh.2.json': { HELLO: '您好' },
    '/dist/en.1.json': { HELLO: 'Hello', FALLBACK: 'English fallback' },
    '/dist/fr.1.json': { HELLO: 'Bonjour' },
  };
  const server = http.createServer((req, res) => {
    paths.push(req.url!);
    res.setHeader('content-type', 'application/json');
    if (failures.delete(req.url!)) {
      res.statusCode = 503;
      res.end('{}');
    } else {
      res.end(JSON.stringify(bundles[req.url!] || {}));
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const port = (server.address() as any).port;
  const globals = {
    user: { lang: 'zh' },
    manifest: { 'locales-zh': 'zh.1.json', 'locales-en': 'en.1.json', 'locales-fr': 'fr.1.json' },
    context: { locales: {} as Record<string, Record<string, string>> },
  };
  const window: any = {};
  const i18next = requireFromSource('i18next').createInstance();
  let initializations = 0;
  i18next.on('initialized', () => initializations++);
  let langCookie = '';
  const browserBoundary = {
    ENV: { isProduction: true },
    cookie: (_: string, value?: string) =>
      value === undefined ? langCookie : (langCookie = value),
    getBrowserLang: () => 'zh',
    request: {
      async get(path: string) {
        const response = await fetch(`http://127.0.0.1:${port}/${path}`);
        if (!response.ok) throw new Error('Locale unavailable');
        return response.json();
      },
    },
  };
  const ts = requireFromSource('typescript');
  const code = ts.transpileModule(readFileSync(join(__dirname, 'i18n.ts'), 'utf8'), {
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
    require: (id: string) => {
      if (id === '@ks-console/shared') return browserBoundary;
      if (id === 'i18next') return i18next;
      return requireFromSource(id);
    },
    globals,
    window,
    console: { warn() {} },
  });
  return {
    init: module.exports.default.init,
    globals,
    window,
    paths,
    failures,
    initializations: () => initializations,
  };
}

test('concurrent extension initialization reads each locale once and initializes i18next once', async t => {
  const f = await fixture(t);
  await Promise.all([f.init(), f.init(), f.init()]);
  await f.init();
  assert.equal(f.paths.filter(p => p === '/dist/zh.1.json').length, 1);
  assert.equal(f.paths.filter(p => p === '/dist/en.1.json').length, 1);
  assert.equal(f.initializations(), 1);
  assert.equal(f.window.t('HELLO'), '你好');
  assert.equal(f.window.t('FALLBACK'), 'English fallback');
});

test('an extension added later updates translations without downloading or initializing again', async t => {
  const f = await fixture(t);
  await f.init();
  f.globals.context.locales = { zh: { HELLO: '扩展覆盖', PLUGIN: '扩展' } };
  await f.init();
  assert.equal(f.window.t('HELLO'), '扩展覆盖');
  assert.equal(f.window.t('PLUGIN'), '扩展');
  assert.equal(f.window.t('FALLBACK'), 'English fallback');
  assert.equal(f.paths.length, 2);
  assert.equal(f.initializations(), 1);
});

test('a failed locale remains retryable while successful fallback data is reused', async t => {
  const f = await fixture(t);
  f.failures.add('/dist/zh.1.json');
  await f.init();
  assert.equal(f.window.t('HELLO'), 'Hello');
  await f.init();
  assert.equal(f.window.t('HELLO'), '你好');
  assert.equal(f.paths.filter(p => p === '/dist/zh.1.json').length, 2);
  assert.equal(f.paths.filter(p => p === '/dist/en.1.json').length, 1);
});

test('language changes and manifest updates load their own bundles', async t => {
  const f = await fixture(t);
  await f.init();
  f.globals.user.lang = 'fr';
  await f.init();
  assert.equal(f.window.t('HELLO'), 'Bonjour');
  f.globals.user.lang = 'zh';
  f.globals.manifest['locales-zh'] = 'zh.2.json';
  await f.init();
  assert.equal(f.window.t('HELLO'), '您好');
  assert.equal(f.window.t('OLD'), 'OLD');
  assert.equal(f.paths.filter(p => p === '/dist/en.1.json').length, 1);
  assert.equal(f.paths.filter(p => p === '/dist/zh.2.json').length, 1);
  assert.equal(f.initializations(), 1);
});

test('an English session loads a single bundle', async t => {
  const f = await fixture(t);
  f.globals.user.lang = 'en';
  await f.init();
  assert.deepEqual(f.paths, ['/dist/en.1.json']);
  assert.equal(f.window.t('HELLO'), 'Hello');
});
