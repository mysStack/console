import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
const sourceRequire = createRequire(join(__dirname, 'permission.ts'));
function fixture(allowed: string[], authKey?: string) {
  const module = { exports: {} as any };
  const ts = sourceRequire('typescript');
  const code = ts.transpileModule(readFileSync(join(__dirname, 'permission.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const globals = {
    config: {
      globalNavs: { children: [{ name: 'observability', skipWorkspaceAuth: true, authKey }] },
      whizardTelemetryNavs: {
        children: [{ name: 'metrics/overview', authKey: 'platform-settings' }],
      },
    },
    user: {},
  };
  const utils = {
    isMultiCluster: () => true,
    isPlatformAdmin: () => allowed.length > 0,
    parser: { safeParseJSON: JSON.parse },
    nav: {
      hasPermission: ({ module }: any) => allowed.includes(module),
      checkNavItem: (item: any, callback: any) =>
        callback({ module: item.authKey || item.name, action: 'view' }),
    },
  };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    globals,
    require: (id: string) => (id === '../utils' ? utils : sourceRequire(id)),
  });
  return module.exports.default();
}
test('telemetry launcher inherits access from real registered child pages', () => {
  assert.equal(fixture(['platform-settings']).getGlobalNavs().length, 1);
  assert.equal(fixture([]).getGlobalNavs().length, 0);
  assert.equal(fixture(['observability']).getGlobalNavs().length, 0);
});
test('telemetry compatibility preserves an explicit launcher permission requirement', () => {
  assert.equal(fixture(['platform-settings'], 'custom-gate').getGlobalNavs().length, 0);
  assert.equal(fixture(['custom-gate'], 'custom-gate').getGlobalNavs().length, 1);
});
