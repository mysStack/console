export type ConfigHistoryView = 'data' | 'history' | 'metadata' | 'events';

export const CONFIG_HISTORY_VIEW_ITEMS: Array<{
  key: Exclude<ConfigHistoryView, 'data'>;
  labelKey: string;
  badgeKey?: string;
}> = [
  { key: 'history', labelKey: 'CONFIG_HISTORY_TAB_HISTORY', badgeKey: 'CONFIG_HISTORY_NEW' },
  { key: 'metadata', labelKey: 'CONFIG_HISTORY_TAB_METADATA' },
  { key: 'events', labelKey: 'CONFIG_HISTORY_TAB_EVENTS' },
];

export const configHistoryTabLabelKeys: Record<ConfigHistoryView, string> = {
  data: 'CONFIG_HISTORY_TAB_DATA',
  history: 'CONFIG_HISTORY_TAB_HISTORY',
  metadata: 'CONFIG_HISTORY_TAB_METADATA',
  events: 'CONFIG_HISTORY_TAB_EVENTS',
};
