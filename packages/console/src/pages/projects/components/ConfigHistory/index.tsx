/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Button, Loading } from '@kubed/components';
import { DiffViewer } from '@kubed/diff-viewer';

import {
  HistoryRecord,
  MANAGED_BY_DIRECT,
  MANAGED_BY_HELM,
  MANAGED_BY_REPLICATOR,
  decodeHistoryPayload,
  diffPair,
  historySecretName,
} from './history';

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
}

const managedByLabelKey = (managedBy: string): string => {
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

const formatTime = (value: string): string => {
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
}: ConfigHistoryPageProps): JSX.Element {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [failedReason, setFailedReason] = useState('');
  const [expanded, setExpanded] = useState<number | undefined>();

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
      let response = await loadSecret();
      if (response.status === 404) {
        setRecords([]);
        setExpanded(undefined);
        return;
      }
      if (!response.ok) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        response = await loadSecret();
      }
      if (response.status === 404) {
        setRecords([]);
        setExpanded(undefined);
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
      setRecords(await decodeHistoryPayload(payload));
      setExpanded(undefined);
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
  }, [cluster, name, namespace]);

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
                  cursor: 'pointer',
                  background: '#fff',
                }}
              >
                <strong>#{record.revision}</strong>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 2,
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
              {isOpen && <div style={{ marginTop: 8 }}>{renderDiff(record)}</div>}
            </div>
          );
        })}
    </div>
  );
}

export default ConfigHistoryPage;
