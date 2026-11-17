import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import yaml from 'js-yaml';

import { hasClusterExtensionModule } from './checker';
import { checkNavItem, hasClusterModule } from './nav';

function fixture() {
  const globals = {
    config: {},
    ksConfig: {
      multicluster: { hostClusterName: 'host' },
      'whizard-monitoring': true,
      'whizard-alerting': true,
      enabledExtensionModulesStatus: {
        'whizard-monitoring': { clusterSchedulingStatuses: { host: false, member: false } },
        'whizard-alerting': { clusterSchedulingStatuses: {} },
        gateway: { clusterSchedulingStatuses: { host: false, member: true } },
      },
    },
  };
  (globalThis as any).globals = globals;
  return globals;
}

test('enabled basic host monitoring remains accessible despite stale agent status', () => {
  const globals = fixture();
  assert.equal(hasClusterExtensionModule('host', 'whizard-monitoring'), true);
  assert.equal(hasClusterModule('host', 'whizard-monitoring'), true);
  assert.equal(hasClusterModule('host', 'whizard-alerting'), true);
  assert.equal(
    globals.ksConfig.enabledExtensionModulesStatus['whizard-monitoring'].clusterSchedulingStatuses
      .host,
    false,
  );
});

test('basic monitoring availability preserves member cluster and unrelated module checks', () => {
  const globals = fixture();
  assert.equal(hasClusterModule('member', 'whizard-monitoring'), false);
  assert.equal(hasClusterModule('member', 'whizard-alerting'), false);
  assert.equal(hasClusterModule('host', 'gateway'), false);
  assert.equal(hasClusterModule('member', 'gateway'), true);
  globals.ksConfig['whizard-monitoring'] = false;
  globals.ksConfig['whizard-alerting'] = false;
  assert.equal(hasClusterModule('host', 'whizard-monitoring'), false);
  assert.equal(hasClusterModule('host', 'whizard-alerting'), false);
});

test('normal cluster navigation exposes built-in monitoring with its original permissions', () => {
  fixture();
  const config = yaml.load(
    readFileSync(resolve(__dirname, '../../../../server/configs/config.yaml'), 'utf8'),
  ) as any;
  const menu = config.client.clusterNavs.children.find(
    (item: any) => item.name === 'monitoring-alerting',
  );
  const visible = (allowed: string[]) =>
    menu.children
      .map((item: any) => ({ ...item, cluster: 'host' }))
      .filter((item: any) => checkNavItem(item, ({ module }: any) => allowed.includes(module)))
      .map((item: any) => item.name);
  assert.deepEqual(visible(['monitoring']), ['monitor-cluster', 'monitor-resource']);
  assert.deepEqual(visible(['alerts', 'rulegroups']), ['alerts', 'alert-rules']);
  assert.deepEqual(visible([]), []);
});

test('project custom monitoring is available through navigation with its own permission', () => {
  const globals = fixture();
  const config = yaml.load(
    readFileSync(resolve(__dirname, '../../../../server/configs/config.yaml'), 'utf8'),
  ) as any;
  const menu = config.client.projectNavs.children.find((item: any) => item.name === 'monitoring');
  const visible = (allowed: string[]) =>
    menu.children
      .map((item: any) => ({ ...item, cluster: 'host' }))
      .filter((item: any) => checkNavItem(item, ({ module }: any) => allowed.includes(module)))
      .map((item: any) => item.name);
  assert.deepEqual(visible(['custom-monitoring']), ['custom-monitoring']);
  assert.deepEqual(visible([]), []);
  globals.ksConfig['whizard-monitoring'] = false;
  assert.deepEqual(visible(['custom-monitoring']), []);
});
