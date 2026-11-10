import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { openNativeEditSettings } from './openNativeEditSettings';

const nativeDetailPages = [
  'Deployments/Detail/index.tsx',
  'StatefulSets/Detail/index.tsx',
  'DaemonSets/Detail/index.tsx',
];

test('原生详情编辑设置只打开配置引用桥，不走裸 V3 open', () => {
  const calls: string[] = [];
  openNativeEditSettings(() => {
    calls.push('bridge');
  });
  assert.deepEqual(calls, ['bridge']);
});

test('Deployment/StatefulSet/DaemonSet 原生详情把编辑设置接到配置引用桥', () => {
  for (const rel of nativeDetailPages) {
    const src = readFileSync(join(__dirname, rel), 'utf8');
    assert.match(
      src,
      /useConfigReferenceBridge\(/,
      `${rel} must mount the config-reference bridge`,
    );
    assert.match(
      src,
      /openNativeEditSettings\(openEditor\)/,
      `${rel} must open 编辑设置 through the config-reference editor`,
    );
    assert.equal(
      src.includes("v3Module: 'workload'"),
      false,
      `${rel} must not open the raw V3 编辑设置 action`,
    );
  }
});
