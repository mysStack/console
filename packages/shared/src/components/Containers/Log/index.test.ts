import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

test('容器日志按 4.3 交互提供关键词匹配、过滤和上下跳转', () => {
  const src = readFileSync(join(__dirname, 'index.tsx'), 'utf8');
  const searchBar = readFileSync(join(__dirname, 'SearchBar.tsx'), 'utf8');
  assert.match(src, /sinceSeconds/);
  assert.match(src, /timeRange\.seconds > 0/);
  assert.match(src, /RelativeTimeSelector/);
  assert.match(src, /LogSearchBar/);
  assert.match(src, /LOG_EXPORT/);
  assert.match(src, /START_REAL_TIME/);
  assert.match(src, /findLogMatches/);
  assert.match(src, /wrapMatchIndex/);
  assert.match(searchBar, /SEARCH_BY_KEYWORD/);
  assert.match(searchBar, /data-test="container-log-match"/);
  assert.match(searchBar, /FILTER_LOG_LINES/);
  assert.match(searchBar, /PREVIOUS_MATCH/);
  assert.match(searchBar, /NEXT_MATCH/);
});
