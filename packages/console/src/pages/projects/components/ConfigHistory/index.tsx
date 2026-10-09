/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Loading } from '@kubed/components';
import { DiffViewer } from '@kubed/diff-viewer';

import {
  HistoryRecord,
  managedByFromAnnotations,
  MANAGED_BY_DIRECT,
  MANAGED_BY_HELM,
  MANAGED_BY_REPLICATOR,
  decodeHistoryPayload,
  diffPair,
  historySecretName,
} from './history';
import { seedHistoryFor } from './seed';

/**
 * Modification history page for a ConfigMap or a Secret.
 *
 * The ConfigMap and Secret detail pages are the V3 console embedded through wujie, so their
 * tab bars cannot be extended from here. This page is therefore a v4 route of its own, and
 * the source pages link to it through the same injection mechanism the config reference
 * entry already uses.
 */

export interface ConfigHistoryPageProps {
  kind: 'ConfigMap' | 'Secret';
  cluster: string;
  namespace: string;
  name: string;
  onBack: () => void;
  onLoaded?: (record: { managedBy: string; managedByRef?: string; createdAt: string }) => void;
}

export const managedByLabelKey = (managedBy: string): string => {
  switch (managedBy) {
    case MANAGED_BY_HELM:
      return 'CONFIG_HISTORY_MANAGED_BY_HELM';
    case MANAGED_BY_REPLICATOR:
      return 'CONFIG_HISTORY_MANAGED_BY_REPLICATOR';
    case MANAGED_BY_DIRECT:
    default:
      return 'CONFIG_HISTORY_MANAGED_BY_DIRECT';
  }
};

export const formatTime = (value: string): string => {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

function ConfigHistoryPage({
  kind,
  cluster,
  namespace,
  name,
  onBack,
  onLoaded,
}: ConfigHistoryPageProps): JSX.Element {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [failedReason, setFailedReason] = useState('');
  const [owner, setOwner] = useState<{ managedBy: string; managedByRef?: string }>();
  const [expanded, setExpanded] = useState<number | undefined>();

  // Kept in a ref so load() does not have to depend on the owner fetch's timing.
  const ownerRef = React.useRef<{ managedBy: string; managedByRef?: string } | undefined>();
  ownerRef.current = owner;

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    let attemptedUrl = '';
    try {
      // Built explicitly rather than through secretStore.getDetailUrl, which returns
      // "api/v1/klusters/<cluster>/namespaces/..." for this case. Two defects in that string,
      // both verified in the browser: the host is spelled "klusters", and the missing leading
      // slash makes the browser resolve it against the current page, so the request lands on
      // a path that serves the SPA's index.html instead of JSON. Measured: the relative form
      // comes back as HTML, /api/v1/klusters/... comes back 404, and the form below comes back
      // 200 with data.records -- with and without the /clusters/<cluster> prefix.
      attemptedUrl = `/clusters/${cluster}/api/v1/namespaces/${namespace}/secrets/${historySecretName(
        name,
      )}`;
      // Plain fetch with credentials, not the console's request wrapper. The same URL returns
      // 200 with data.records through fetch in the logged-in console, while request.get on the
      // very same string fails with "Failed to fetch" -- a network level TypeError, i.e. the
      // wrapper never completed the call. The wrapper adds a base URL and interceptors that are
      // not ready while this page mounts, and its failure hides which URL it actually used.
      // Measured, not guessed: the very same call from the very same tab returns 200 with
      // data.records once the console shell has settled, while running it on mount fails with
      // "Failed to fetch" -- a network level TypeError with no further detail. So the call is
      // retried once after the shell has had a moment, rather than appending a workaround for
      // an unknown: the condition under which it succeeds is the one being waited for.
      const loadSecret = () => fetch(attemptedUrl, { credentials: 'include' });
      // A missing history Secret is not a failure: it means nothing has been recorded yet, which
      // is the normal state for an object that has not changed since the controller started. This
      // has to be checked on the response status -- the earlier version read it off an axios style
      // error, which stopped applying when the call moved to fetch, and a plain 404 then rendered
      // as an error.
      // The object itself is needed for the attributes: ???? has to come from its own
      // annotations, because an object with no history yet has no record to read it from.
      const objectUrl = `/clusters/${cluster}/api/v1/namespaces/${namespace}/${
        kind === 'ConfigMap' ? 'configmaps' : 'secrets'
      }/${name}`;
      let managed = managedByFromAnnotations(undefined);
      try {
        const objectResponse = await fetch(objectUrl, { credentials: 'include' });
        if (objectResponse.ok) {
          const object: any = await objectResponse.json();
          managed = managedByFromAnnotations(object?.metadata?.annotations);
        }
      } catch {
        // Keep the conservative default; the attribute row still renders.
      }
      setOwner(managed);

      let response = await loadSecret();
      if (response.status === 404) {
        // First view of an object that has not changed yet: write the baseline so the list is
        // not empty. Only objects somebody opens get one; the cluster is not seeded at startup.
        void seedHistoryFor({ cluster, namespace, kind, name }).then(seeded => {
          if (seeded) {
            load();
          }
        });
        setRecords([]);
        setExpanded(undefined);
        // Report anyway: the attributes need the managed-by value even when nothing is recorded yet.
        onLoaded?.({ ...managed, createdAt: '' });
        return;
      }
      if (!response.ok) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        response = await loadSecret();
      }
      if (response.status === 404) {
        // First view of an object that has not changed yet: write the baseline so the list is
        // not empty. Only objects somebody opens get one; the cluster is not seeded at startup.
        void seedHistoryFor({ cluster, namespace, kind, name }).then(seeded => {
          if (seeded) {
            load();
          }
        });
        setRecords([]);
        setExpanded(undefined);
        // Report anyway: the attributes need the managed-by value even when nothing is recorded yet.
        onLoaded?.({ ...managed, createdAt: '' });
        return;
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      const body = await response.json();
      // request may hand back the resource itself or an axios-style wrapper around it, so
      // accept either rather than assuming one and failing silently.
      const secret = (body as any)?.data?.data ? (body as any).data : body;
      const payload = (secret as any)?.data?.records;
      const loaded = await decodeHistoryPayload(payload);
      setRecords(loaded);
      onLoaded?.({ ...managed, createdAt: loaded[0]?.createdAt || '' });
      // The newest record is the current state, so it opens by default; the rest stay collapsed.
      setExpanded(loaded[0]?.revision);
    } catch (error) {
      // A missing history Secret simply means nothing has been recorded yet.
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 404) {
        setRecords([]);
      } else {
        // Say what failed: an error state that hides the reason cannot be diagnosed from a
        // screenshot, which is exactly how this one was found.
        const message =
          (error as any)?.response?.data?.message ||
          (error as any)?.response?.statusText ||
          (error as any)?.message ||
          String(error);
        // Include the target: "Failed to fetch" alone says nothing about which URL was asked
        // for, and that is the one thing needed to fix it.
        setFailedReason(`${String(message).slice(0, 160)} | url=${attemptedUrl}`.slice(0, 400));
        setFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [cluster, kind, name, namespace, onLoaded]);

  useEffect(() => {
    load();
  }, [load]);

  const renderDiff = (record: HistoryRecord) => {
    const pair = diffPair(records, record.revision);
    return (
      <DiffViewer
        oldValue={pair.oldValue}
        newValue={pair.newValue}
        title={t('CONFIG_HISTORY_CONTENT')}
        description={
          pair.comparedRevision
            ? t('COMPARE_WITH', { version: `#${pair.comparedRevision}` })
            : t('CONFIG_HISTORY_FIRST_REVISION')
        }
      />
    );
  };

  return (
    <div style={{ padding: 24 }} data-test="config-history-page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Button type="button" onClick={onBack}>
          {t('BACK')}
        </Button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18 }}>{t('REVISION_RECORDS')}</h1>
          <p style={{ margin: '4px 0 0', color: '#79879c', fontSize: 12 }}>
            {kind} · {cluster} / {namespace} / {name}
          </p>
        </div>
      </div>

      <p style={{ color: '#79879c', fontSize: 12, marginBottom: 16 }}>{t('CONFIG_HISTORY_HINT')}</p>

      {loading && <Loading />}

      {!loading && failed && (
        <div role="alert" style={{ color: '#d03050', marginBottom: 12 }}>
          {t('CONFIG_HISTORY_LOAD_ERROR')}
          {failedReason ? ` (${failedReason})` : ''}{' '}
          <Button type="button" onClick={load}>
            {t('RETRY')}
          </Button>
        </div>
      )}

      {!loading && !failed && records.length === 0 && (
        <div style={{ color: '#79879c' }}>{t('CONFIG_HISTORY_EMPTY')}</div>
      )}

      {!loading && !failed && records.length > 0 && (
        <div
          style={{
            marginTop: 16,
            marginBottom: 4,
            padding: '10px 14px',
            background: '#fdf1f4',
            borderLeft: '3px solid #d03050',
            color: '#8c4a58',
            fontSize: 12,
            lineHeight: 1.85,
          }}
        >
          {t('CONFIG_HISTORY_SOURCE_NOTE')}
        </div>
      )}

      {!loading &&
        !failed &&
        records.map(record => {
          const isOpen = expanded === record.revision;
          return (
            <div key={record.revision} style={{ marginBottom: 12 }}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(isOpen ? undefined : record.revision)}
                onKeyDown={event => {
                  if (event.key === 'Enter') {
                    setExpanded(isOpen ? undefined : record.revision);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  border: `1px solid ${isOpen ? '#55bc8a' : '#d8e0e8'}`,
                  borderRadius: 4,
                  // The native cards in this console carry this shadow; measured from the page's own
                  // property panel and content card, both 4px radius with this exact shadow.
                  boxShadow: '0 4px 8px rgba(36, 46, 66, 0.06)',
                  cursor: 'pointer',
                  background: '#fff',
                }}
              >
                <strong>#{record.revision}</strong>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 10px',
                    borderRadius: 4,
                    background: '#e8f7ef',
                    color: '#189a4d',
                  }}
                >
                  {t(managedByLabelKey(record.managedBy))}
                  {record.managedByRef ? ` · ${record.managedByRef}` : ''}
                </span>
                <span style={{ color: '#79879c', fontSize: 12 }}>
                  {formatTime(record.createdAt)}
                </span>
                {record.contentOmitted && (
                  <span style={{ color: '#f5a623', fontSize: 12 }}>
                    {t('CONFIG_HISTORY_CONTENT_OMITTED')}
                  </span>
                )}
              </div>
              {isOpen && (
                <div style={{ marginTop: 8 }}>
                  {/* The three facts the design puts above the diff. */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 56,
                      padding: '12px 16px',
                      border: '1px solid #e3e9ef',
                      borderBottom: 'none',
                      borderRadius: '4px 4px 0 0',
                      background: '#fff',
                      boxShadow: '0 4px 8px rgba(36, 46, 66, 0.06)',
                    }}
                  >
                    <div>
                      <div style={{ color: '#79879c', fontSize: 12, marginBottom: 4 }}>
                        {t('CONFIG_HISTORY_SERIAL')}
                      </div>
                      <b>#{record.revision}</b>
                    </div>
                    <div>
                      <div style={{ color: '#79879c', fontSize: 12, marginBottom: 4 }}>
                        {t('CONFIG_HISTORY_CHANGED_AT')}
                      </div>
                      <b>{formatTime(record.createdAt)}</b>
                    </div>
                    <div>
                      <div style={{ color: '#79879c', fontSize: 12, marginBottom: 4 }}>
                        {t('CONFIG_HISTORY_MANAGED_BY')}
                      </div>
                      <b>
                        {t(managedByLabelKey(record.managedBy))}
                        {record.managedByRef ? `（源版本 ${record.managedByRef}）` : ''}
                      </b>
                    </div>
                  </div>
                  {renderDiff(record)}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}

export default ConfigHistoryPage;
