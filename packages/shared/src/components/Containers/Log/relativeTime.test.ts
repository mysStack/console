import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_RELATIVE_TIME,
  createRelativeTime,
  parseRelativeTime,
  toSeconds,
} from './relativeTime';

test('默认时间范围为最近 15 分钟', () => {
  assert.equal(DEFAULT_RELATIVE_TIME.seconds, 900);
  assert.deepEqual(parseRelativeTime('15m'), createRelativeTime(15, 'm'));
});

test('把预设和自定义时间换算成 sinceSeconds', () => {
  assert.equal(toSeconds(30, 'm'), 1800);
  assert.equal(toSeconds(1, 'h'), 3600);
  assert.equal(toSeconds(1, 'd'), 86400);
  assert.equal(parseRelativeTime('6h').seconds, 21600);
});

test('无法解析时回退到 15 分钟', () => {
  assert.deepEqual(parseRelativeTime('oops'), DEFAULT_RELATIVE_TIME);
});
