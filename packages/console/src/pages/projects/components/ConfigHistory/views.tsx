/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';

/**
 * The two views the design puts beside 修改记录, built here because the embedded ConfigMap and Secret
 * pages have only one native tab (数据) -- 元数据 and 事件 belong to the workload pages.
 *
 * Both read the object and its events through the same proxy prefix the history loader uses. That
 * prefix is built by hand rather than through secretStore.getDetailUrl, which returns a misspelled
 * "klusters" segment and no leading slash for this case.
 */

const panelStyle: React.CSSProperties = {
  border: '1px solid #e3e9ef',
  borderRadius: 4,
  background: '#fff',
  boxShadow: '0 4px 8px rgba(36, 46, 66, 0.06)',
  overflow: 'hidden',
};

const headStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid #eef2f6',
  fontWeight: 600,
  fontSize: 13,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid #f4f7fa',
  fontSize: 12,
  lineHeight: '20px',
};

const keyStyle: React.CSSProperties = {
  width: 260,
  flex: '0 0 260px',
  padding: '8px 16px',
  color: '#79879c',
  background: '#fafbfc',
  wordBreak: 'break-all',
};

const valStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 16px',
  color: '#36435c',
  wordBreak: 'break-all',
  whiteSpace: 'pre-wrap',
};

const emptyStyle: React.CSSProperties = {
  padding: '28px 16px',
  color: '#79879c',
  fontSize: 12,
  textAlign: 'center',
};

const modules: Record<string, string> = { ConfigMap: 'configmaps', Secret: 'secrets' };

function useObject(cluster: string, namespace: string, name: string, kind: string) {
  const [object, setObject] = useState<any>();
  const [failed, setFailed] = useState('');
  const load = useCallback(async () => {
    if (!cluster || !namespace || !name) {
      return;
    }
    const url = `/clusters/${cluster}/api/v1/namespaces/${namespace}/${modules[kind] || 'configmaps'}/${name}`;
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        setFailed(`${response.status}`);
        return;
      }
      setObject(await response.json());
    } catch (error) {
      setFailed((error as Error)?.message || 'failed');
    }
  }, [cluster, kind, name, namespace]);
  useEffect(() => {
    void load();
  }, [load]);
  return { object, failed };
}

function Table({ title, entries }: { title: string; entries: [string, string][] }) {
  return (
    <div style={{ ...panelStyle, marginBottom: 16 }}>
      <div style={headStyle}>{title}</div>
      {entries.length === 0 ? (
        <div style={emptyStyle}>—</div>
      ) : (
        entries.map(([key, value]) => (
          <div key={key} style={rowStyle}>
            <div style={keyStyle}>{key}</div>
            <div style={valStyle}>{value}</div>
          </div>
        ))
      )}
    </div>
  );
}

/** The object's own labels and annotations, read only. */
export function MetadataView({
  cluster,
  namespace,
  name,
  kind,
}: {
  cluster: string;
  namespace: string;
  name: string;
  kind: string;
}) {
  const { object, failed } = useObject(cluster, namespace, name, kind);
  if (failed) {
    return <div style={emptyStyle}>读取元数据失败 ({failed})</div>;
  }
  const labels = Object.entries(object?.metadata?.labels || {}) as [string, string][];
  const annotations = Object.entries(object?.metadata?.annotations || {}) as [string, string][];
  return (
    <div>
      <Table title="标签" entries={labels} />
      <Table title="注解" entries={annotations} />
    </div>
  );
}

interface EventItem {
  type?: string;
  reason?: string;
  message?: string;
  lastTimestamp?: string;
  eventTime?: string;
  count?: number;
}

/** The object's events, newest first. */
export function EventsView({
  cluster,
  namespace,
  name,
}: {
  cluster: string;
  namespace: string;
  name: string;
}) {
  const [items, setItems] = useState<EventItem[]>([]);
  const [failed, setFailed] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!cluster || !namespace || !name) {
      return;
    }
    setLoading(true);
    const selector = encodeURIComponent(`involvedObject.name=${name}`);
    const url = `/clusters/${cluster}/api/v1/namespaces/${namespace}/events?fieldSelector=${selector}`;
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        setFailed(`${response.status}`);
        return;
      }
      const body = await response.json();
      const list: EventItem[] = body?.items || [];
      list.sort((a, b) => {
        const left = a.lastTimestamp || a.eventTime || '';
        const right = b.lastTimestamp || b.eventTime || '';
        return right.localeCompare(left);
      });
      setItems(list);
    } catch (error) {
      setFailed((error as Error)?.message || 'failed');
    } finally {
      setLoading(false);
    }
  }, [cluster, name, namespace]);
  useEffect(() => {
    void load();
  }, [load]);
  if (failed) {
    return <div style={emptyStyle}>读取事件失败 ({failed})</div>;
  }
  if (loading) {
    return <div style={emptyStyle}>加载中…</div>;
  }
  if (items.length === 0) {
    return <div style={emptyStyle}>暂无事件</div>;
  }
  return (
    <div style={{ ...panelStyle }}>
      <div style={headStyle}>事件</div>
      {items.map((item, index) => (
        <div
          key={`${item.reason}-${index}`}
          style={{ ...rowStyle, display: 'block', padding: '10px 16px' }}
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
            <span
              style={{
                fontSize: 11,
                padding: '1px 8px',
                borderRadius: 4,
                background: item.type === 'Warning' ? '#fdf1f4' : '#e8f7ef',
                color: item.type === 'Warning' ? '#d03050' : '#189a4d',
              }}
            >
              {item.type || 'Normal'}
            </span>
            <b style={{ fontSize: 12 }}>{item.reason}</b>
            {item.count && item.count > 1 ? (
              <span style={{ color: '#79879c', fontSize: 11 }}>×{item.count}</span>
            ) : null}
            <span style={{ marginLeft: 'auto', color: '#79879c', fontSize: 11 }}>
              {(item.lastTimestamp || item.eventTime || '').replace('T', ' ').slice(0, 19)}
            </span>
          </div>
          <div
            style={{ color: '#36435c', fontSize: 12, lineHeight: '18px', wordBreak: 'break-all' }}
          >
            {item.message}
          </div>
        </div>
      ))}
    </div>
  );
}
