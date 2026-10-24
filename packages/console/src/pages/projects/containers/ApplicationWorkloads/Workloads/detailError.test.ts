import assert from 'node:assert';
import test from 'node:test';

import { getWorkloadDetailErrorPath } from './detailError';

test('工作负载详情 403 错误跳转到无权限页面', () => {
  assert.equal(getWorkloadDetailErrorPath({ response: { status: 403 } }), '/errors/403');
});

test('工作负载详情 404 错误跳转到 NotFound 页面', () => {
  assert.equal(getWorkloadDetailErrorPath({ response: { status: 404 } }), '/404');
});

test('工作负载详情其他错误保留在当前页显示错误提示', () => {
  assert.equal(getWorkloadDetailErrorPath({ response: { status: 500 } }), undefined);
  assert.equal(getWorkloadDetailErrorPath(new Error('network unavailable')), undefined);
});
