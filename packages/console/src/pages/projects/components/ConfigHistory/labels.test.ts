import assert from 'node:assert';
import test from 'node:test';

import { CONFIG_HISTORY_VIEW_ITEMS, configHistoryTabLabelKeys } from './labels';

test('config history tabs follow the frozen data/history/metadata/events order', () => {
  assert.deepEqual(
    ['data', ...CONFIG_HISTORY_VIEW_ITEMS.map(item => item.key)],
    ['data', 'history', 'metadata', 'events'],
  );
  assert.deepEqual(Object.values(configHistoryTabLabelKeys), [
    'CONFIG_HISTORY_TAB_DATA',
    'CONFIG_HISTORY_TAB_HISTORY',
    'CONFIG_HISTORY_TAB_METADATA',
    'CONFIG_HISTORY_TAB_EVENTS',
  ]);
  assert.equal(CONFIG_HISTORY_VIEW_ITEMS[0].badgeKey, 'CONFIG_HISTORY_NEW');
});
