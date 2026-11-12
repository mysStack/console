import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_LOG_MATCHES,
  findLogMatches,
  groupMatchesByLine,
  splitLogLines,
  visibleLineNumbers,
  wrapMatchIndex,
} from './match';

test('空匹配不产生结果', () => {
  const lines = splitLogLines('error one\ninfo two\n');
  assert.deepEqual(findLogMatches(lines, ''), []);
  assert.deepEqual(findLogMatches(lines, '   '), []);
});

test('按关键字大小写不敏感统计每一处命中', () => {
  const lines = splitLogLines('ERROR failed to start\nINFO ready\nerror retry\n');
  const matches = findLogMatches(lines, 'error');
  assert.equal(matches.length, 2);
  assert.deepEqual(
    matches.map(item => item.lineNumber),
    [1, 3],
  );
});

test('过滤时只保留命中行', () => {
  const lines = splitLogLines('ERROR failed\nINFO ready\nerror retry');
  const matches = findLogMatches(lines, 'error');
  assert.deepEqual(visibleLineNumbers(lines.length, matches, true), [1, 3]);
  assert.deepEqual(visibleLineNumbers(lines.length, matches, false), [1, 2, 3]);
});

test('上下跳转在命中之间循环', () => {
  assert.equal(wrapMatchIndex(0, 3, 1), 1);
  assert.equal(wrapMatchIndex(2, 3, 1), 0);
  assert.equal(wrapMatchIndex(0, 3, -1), 2);
});

test('高频关键字截断命中数量，避免一次画出上万个高亮节点', () => {
  const lines = Array.from({ length: 200 }, () => 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
  const matches = findLogMatches(lines, 'a');
  assert.equal(matches.length, MAX_LOG_MATCHES);
  const grouped = groupMatchesByLine(matches);
  assert.equal(grouped.size > 0, true);
  assert.equal((grouped.get(1) || []).length <= 30, true);
});
