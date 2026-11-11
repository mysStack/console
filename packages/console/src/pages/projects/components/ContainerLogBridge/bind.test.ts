import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { bindV3ContainerLogClick, collectV3ContainerLogRoots } from './bind';

test('日志点击要覆盖宿主 document、Wujie iframe 和 shadow', () => {
  const host = { id: 'host' } as unknown as Document;
  const iframeDoc = { id: 'iframe' } as unknown as Document;
  const shadow = { id: 'shadow' } as unknown as ShadowRoot;
  const appWindow = { document: iframeDoc } as Window;
  assert.deepEqual(collectV3ContainerLogRoots(host, appWindow, shadow), [host, iframeDoc, shadow]);
  assert.deepEqual(collectV3ContainerLogRoots(host, { document: host } as Window, null), [host]);
});

test('shadow 里的 iframe document 也要进拦截根', () => {
  const iframeDoc = { id: 'shadow-iframe' } as unknown as Document;
  const shadow = {
    querySelectorAll: (selector: string) =>
      selector === 'iframe' ? [{ contentDocument: iframeDoc }] : [],
  } as unknown as ShadowRoot;
  const host = {
    querySelectorAll: () => [],
  } as unknown as Document;
  const roots = collectV3ContainerLogRoots(host, undefined, shadow);
  assert.equal(roots.includes(host), true);
  assert.equal(roots.includes(shadow), true);
  assert.equal(roots.includes(iframeDoc), true);
});

test('在每个根上用捕获阶段监听点击', () => {
  const attached: Array<{ type: string; capture: boolean }> = [];
  const root = {
    addEventListener(type: string, _fn: EventListener, capture: boolean) {
      attached.push({ type, capture });
    },
    removeEventListener() {
      attached.pop();
    },
  } as unknown as Document;
  const unbind = bindV3ContainerLogClick([root], () => undefined);
  assert.deepEqual(attached, [{ type: 'click', capture: true }]);
  unbind();
  assert.deepEqual(attached, []);
});

test('工作空间日志桥要绑 Wujie 全部根，不能只听 appWindow.document', () => {
  const src = readFileSync(join(__dirname, 'useV3ContainerLogBridge.tsx'), 'utf8');
  assert.match(src, /collectV3ContainerLogRoots/);
  assert.match(src, /bindV3ContainerLogClick/);
  assert.match(src, /wujie-app\[data-wujie-id="consolev3"\]/);
  assert.doesNotMatch(src, /appWindow\.document\.addEventListener/);
});
