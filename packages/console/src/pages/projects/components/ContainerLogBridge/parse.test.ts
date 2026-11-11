import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
  isV3ContainerLogIcon,
  parseContainerNameFromHref,
  parsePodNameFromHref,
  parseV3ContainerLogClick,
} from './parse';

test('从容器链接解析 Pod 和容器名', () => {
  const href =
    '/consolev3/dev-workspace/clusters/host/projects/dev-wes/pods/hip-server-7f486cd778-x8cr7/containers/hip-server';
  assert.equal(parsePodNameFromHref(href), 'hip-server-7f486cd778-x8cr7');
  assert.equal(parseContainerNameFromHref(href), 'hip-server');
});

test('终端图标不能当成容器日志', () => {
  assert.equal(isV3ContainerLogIcon('icon icon-clickable margin-l8 qicon-log'), true);
  assert.equal(isV3ContainerLogIcon('qicon qicon-log'), true);
  assert.equal(isV3ContainerLogIcon('icon icon-clickable margin-l8 qicon-terminal'), false);
  assert.equal(isV3ContainerLogIcon('qicon qicon-terminal'), false);
});

test('点击日志图标时带出 pod 和容器', () => {
  const svg = {
    className: 'qicon qicon-log',
    parentElement: null as {
      className: string;
      querySelector: Function;
      parentElement: any;
    } | null,
  };
  const icon = {
    className: 'icon icon-clickable margin-l8',
    parentElement: null as any,
    querySelector(selector: string) {
      if (String(selector).includes('qicon-log')) return svg;
      if (String(selector).includes('qicon-terminal')) return null;
      if (String(selector).includes('/containers/')) {
        return {
          getAttribute() {
            return '/consolev3/clusters/host/projects/dev-wes/pods/hip-server-abc/containers/hip-server';
          },
        };
      }
      return null;
    },
  };
  svg.parentElement = icon;
  icon.parentElement = {
    className: 'name',
    querySelector: icon.querySelector.bind(icon),
    parentElement: null,
  };
  const parsed = parseV3ContainerLogClick(svg as any);
  assert.deepEqual(parsed, {
    podName: 'hip-server-abc',
    containerName: 'hip-server',
  });
});

test('点击终端图标不拦截', () => {
  const svg = {
    className: 'qicon qicon-terminal',
    parentElement: null as any,
  };
  const icon = {
    className: 'icon icon-clickable margin-l8',
    parentElement: { querySelector: () => null },
    querySelector(selector: string) {
      if (String(selector).includes('qicon-terminal')) return svg;
      if (String(selector).includes('qicon-log')) return null;
      return null;
    },
  };
  svg.parentElement = icon;
  assert.equal(parseV3ContainerLogClick(svg as any), null);
});

test('工作空间详情在 Wujie 挂载后拦截 V3 日志图标并打开原生日志', () => {
  const files = [
    join(__dirname, '../../containers/Deployments/Detail/index.tsx'),
    join(__dirname, '../../containers/DaemonSets/Detail/index.tsx'),
    join(__dirname, '../../containers/StatefulSets/Detail/index.tsx'),
    join(__dirname, '../../containers/Pods/Detail/index.tsx'),
  ];
  for (const file of files) {
    const src = readFileSync(file, 'utf8');
    assert.match(src, /useV3ContainerLogBridge/, `${file} must open native logs`);
    assert.match(src, /bindContainerLog/, `${file} must bind the log click bridge`);
  }
});
