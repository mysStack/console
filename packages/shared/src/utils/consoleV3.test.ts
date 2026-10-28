import assert from 'node:assert';
import test from 'node:test';

import { getConsoleV3UrlPrefix } from './consoleV3';

test('builds the absolute Wujie prefix consumed by V3 resource embeds', () => {
  assert.equal(
    getConsoleV3UrlPrefix('/test-workspace/clusters/host/projects/test-wes', '192.168.2.131:30880'),
    '//192.168.2.131:30880/consolev3/test-workspace/clusters/host/projects/test-wes',
  );
});

test('keeps the consolev3 marker that ConsoleV3ResourceList requires', () => {
  const prefix = getConsoleV3UrlPrefix('/wes/clusters/host/projects/dev-wes', 'console.local');

  assert.match(prefix, /\/consolev3\//);
  assert.match(`${prefix}/pods`, /\/consolev3\//);
});
