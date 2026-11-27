/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const requireFromSource = createRequire(join(__dirname, 'extensions.remote.ts'));

function fixture(
  configs: Record<string, any>,
  options: { production?: boolean; failRefresh?: boolean } = {},
) {
  const names = Object.keys(configs);
  const imports: string[] = [];
  const registered: any[] = [];
  const locales: Record<string, any> = {};
  const localeSnapshots: any[] = [];
  const errors: string[] = [];
  const ts = requireFromSource('typescript');
  const code = ts.transpileModule(readFileSync(join(__dirname, 'extensions.remote.ts'), 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} as any };
  const globals = {
    installedExtensions: names.map(name => ({
      extensionName: name,
      link: '/' + name + '/index.js',
      resourceVersion: '1',
      entries: name === 'menus' ? [{ name: 'installed-menu' }] : undefined,
    })),
    config: { importRemoteExtensions: { includes: ['*'], excludes: ['disabled'] } },
    context: {
      registerLocales(values: Record<string, any> = {}) {
        Object.entries(values).forEach(([lang, value]) => {
          locales[lang] = { ...locales[lang], ...value };
        });
      },
      registerExtension(config: any, metadata: any) {
        registered.push({ config, metadata });
      },
    },
  };
  let failRefresh = options.failRefresh;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id: string) => {
      if (id === '@ks-console/shared') {
        return {
          ENV: {
            isProduction: options.production !== false,
            isDevelopment: options.production === false,
          },
        };
      }
      if (id === './extensions.config') {
        return {
          resolveExtensionConfig: async (input: any) =>
            typeof input === 'function' ? input() : input,
        };
      }
      if (id === './i18n') {
        return {
          init: async () => {
            localeSnapshots.push(JSON.parse(JSON.stringify(locales)));
            if (failRefresh) {
              failRefresh = false;
              throw new Error('refresh failed');
            }
          },
        };
      }
      return requireFromSource(id);
    },
    System: {
      import: async (url: string) => {
        imports.push(url);
        const name = url.split('/')[2];
        if (configs[name] instanceof Error) throw configs[name];
        return { default: configs[name] };
      },
    },
    globals,
    console: { error: (name: string) => errors.push(name) },
  });

  return {
    load: module.exports.registerRemoteExtensions,
    imports,
    registered,
    localeSnapshots,
    errors,
  };
}

test('installed extension locale resources are refreshed once before routes and menus register', async () => {
  const f = fixture({
    workloads: { locales: { en: { workload: 'Workload' } }, routes: [{ path: 'workloads' }] },
    menus: { locales: { en: { menu: 'Menu' } }, menus: [{ name: 'module-menu' }] },
    plain: { routes: [{ path: 'plain' }] },
  });
  const results = await f.load();
  assert.equal(f.imports.length, 3);
  assert.equal(f.localeSnapshots.length, 1);
  assert.deepEqual(f.localeSnapshots[0], { en: { workload: 'Workload', menu: 'Menu' } });
  assert.deepEqual(
    f.registered.map(x => x.metadata.extensionName),
    ['workloads', 'menus', 'plain'],
  );
  assert.equal(f.registered[1].config.menus[0].name, 'installed-menu');
  assert.ok(results.every((result: any) => result.status === 'fulfilled'));
});

test('a failing plugin does not suppress healthy routes or installed menu overrides', async () => {
  const f = fixture({
    broken: new Error('unavailable'),
    menus: { locales: { en: { menu: 'Menu' } } },
    plain: { routes: [{ path: 'plain' }] },
  });
  const results = await f.load();
  assert.deepEqual(
    Array.from(results, (result: any) => result.status),
    ['rejected', 'fulfilled', 'fulfilled'],
  );
  assert.deepEqual(
    f.registered.map(x => x.metadata.extensionName),
    ['menus', 'plain'],
  );
  assert.deepEqual(f.errors, ['[broken]']);
});

test('a transient locale refresh failure retries without dropping healthy plugin entries', async () => {
  const f = fixture(
    {
      menus: { locales: { en: { menu: 'Menu' } } },
      plain: { routes: [{ path: 'plain' }] },
    },
    { failRefresh: true },
  );
  const results = await f.load();
  assert.equal(f.registered.length, 2);
  assert.equal(f.localeSnapshots.length, 2);
  assert.ok(results.every((result: any) => result.status === 'fulfilled'));
});

test('development include/exclude selection is unchanged', async () => {
  const f = fixture(
    { active: { routes: [{ path: 'active' }] }, disabled: {} },
    { production: false },
  );
  await f.load();
  assert.equal(f.imports.length, 1);
  assert.equal(f.registered[0].metadata.extensionName, 'active');
});

test('no installed extensions performs no translation refresh', async () => {
  const f = fixture({});
  await f.load();
  assert.equal(f.localeSnapshots.length, 0);
});

test('13 asynchronously resolved extensions publish all locale resources and entries in one refresh', async () => {
  const configs = Object.fromEntries(
    Array.from({ length: 13 }, (_, index) => [
      `plugin-${index}`,
      async () => {
        await new Promise(resolve => setTimeout(resolve, (13 - index) * 2));
        return {
          locales: { en: { [`plugin-${index}`]: `Plugin ${index}` } },
          routes: [{ path: `plugin-${index}` }],
        };
      },
    ]),
  );
  const f = fixture(configs);
  const results = await f.load();
  assert.equal(f.imports.length, 13);
  assert.equal(f.localeSnapshots.length, 1);
  assert.equal(Object.keys(f.localeSnapshots[0].en).length, 13);
  assert.equal(f.registered.length, 13);
  assert.ok(results.every((result: any) => result.status === 'fulfilled'));
});

test('installed menu entries register even if the module has no default config', async () => {
  const f = fixture({ menus: null });
  await f.load();
  assert.equal(f.registered.length, 1);
  assert.equal(f.registered[0].config.menus[0].name, 'installed-menu');
});
