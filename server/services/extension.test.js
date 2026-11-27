const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

async function modules(name, status) {
  const module = { exports: {} };
  vm.runInNewContext(readFileSync(path.join(__dirname, 'extension.js'), 'utf8'), {
    module,
    exports: module.exports,
    require: id =>
      id === '../libs/request'
        ? { sendGatewayRequest: async () => ({ items: [{ metadata: { name }, status }] }) }
        : require(id),
  });
  return module.exports.getEnabledExtensionModules(
    { token: 'test-session' },
    {
      app: {
        emit: () => {
          throw Error('Unexpected gateway failure');
        },
      },
    },
  );
}

test('basic telemetry requires an enabled platform installation before exposing navigation', async () => {
  for (const name of ['whizard-monitoring', 'whizard-alerting']) {
    for (const status of [
      { enabled: false, state: 'Installed', installedVersion: '1.2.2' },
      { enabled: true, state: 'Installing' },
      { enabled: true, state: 'InstallFailed' },
    ]) {
      const result = await modules(name, status);
      assert.equal(result.enabledExtensionModules[name], undefined);
      assert.equal(result.enabledExtensionModulesStatus[name], undefined);
    }
  }
});

test('installed telemetry remains available during upgrade and preserves the actual agent state', async () => {
  const result = await modules('whizard-monitoring', {
    enabled: true,
    state: 'UpgradeFailed',
    installedVersion: '1.2.2',
    clusterSchedulingStatuses: { host: { state: 'InstallFailed' } },
  });
  assert.equal(result.enabledExtensionModules['whizard-monitoring'], true);
  assert.equal(
    result.enabledExtensionModulesStatus['whizard-monitoring'].clusterSchedulingStatuses.host,
    false,
  );
});

test('installed legacy telemetry and unrelated extension flags keep their existing behavior', async () => {
  assert.equal(
    (await modules('whizard-alerting', { enabled: true, state: 'Installed' }))
      .enabledExtensionModules['whizard-alerting'],
    true,
  );
  assert.equal((await modules('gateway', { enabled: true })).enabledExtensionModules.gateway, true);
});
