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

export const MONO = "'SFMono-Regular', Consolas, monospace";

const MANAGED_BY_TAG_COLORS: Record<string, { background: string; color: string }> = {
  helm: { background: '#eef2fb', color: '#3b6fd4' },
  replicator: { background: '#e8f7ef', color: '#189a4d' },
  direct: { background: '#f2f4f7', color: '#79879c' },
};

/** Tag colours from the design: Helm blue, replicator green, everything else grey. */
function managedByColors(managedBy: string): { background: string; color: string } {
  return MANAGED_BY_TAG_COLORS[managedBy] || MANAGED_BY_TAG_COLORS.direct;
}

interface ConfigHistoryPageProps {
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
    if (!pair.comparedRevision) {
      // Nothing before it: the viewer needs both sides, and inventing an empty one is what it cannot
      // parse. The list is left out entirely.
      return (
        <div
          style={{
            padding: '10px 16px',
            border: '1px solid #e3e9ef',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            background: '#fff',
            color: '#79879c',
            fontSize: 12,
          }}
        >
          {t('CONFIG_HISTORY_FIRST_REVISION')}
        </div>
      );
    }
    const oldText = pair.oldValue || '';
    const newText = pair.newValue || '';
    const oldLines = oldText.split('\n').filter(Boolean);
    const newLines = newText.split('\n').filter(Boolean);
    // A change that only removes lines makes the viewer emit a hunk header with a negative count
    // (-0,0 +1,-1) and report that it cannot parse the lines. Its rendering of that case is right, but
    // the complaint is not, so the listing is drawn here instead.
    const onlyRemovals = newLines.length > 0 && newLines.every(line => oldLines.indexOf(line) >= 0);
    const line = (text: string, mark: string, background: string, color: string) => (
      <div style={{ display: 'flex', background, color, lineHeight: 2, fontFamily: MONO }}>
        <div
          style={{
            width: 54,
            flex: '0 0 54px',
            textAlign: 'right',
            paddingRight: 12,
            color: '#a8b3c0',
            background: '#fafbfc',
          }}
        />
        <div style={{ flex: 1, paddingLeft: 12, whiteSpace: 'pre' }}>
          <span style={{ padding: '0 6px', fontWeight: 700 }}>{mark}</span>
          {text}
        </div>
      </div>
    );
    if (onlyRemovals) {
      const removed = oldLines.filter(item => newLines.indexOf(item) < 0);
      return (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              border: '1px solid #e3e9ef',
              borderTop: 'none',
              background: '#fff',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {'\u25be '}
              {t('CONFIG_HISTORY_CONTENT')}
              {'\u3000\u203a'}
            </span>
            <span style={{ color: '#55bc8a', fontSize: 12 }}>
              {t('COMPARE_WITH', { version: `#${pair.comparedRevision}` })}
            </span>
          </div>
          <div
            style={{
              border: '1px solid #e3e9ef',
              borderTop: 'none',
              fontFamily: MONO,
              fontSize: 12,
            }}
          >
            {removed.map((item, index) => (
              <React.Fragment key={`del-${index}`}>
                {line(item, '-', '#fdf1f4', '#d03050')}
              </React.Fragment>
            ))}
            {newLines.map((item, index) => (
              <React.Fragment key={`ctx-${index}`}>
                {line(item, ' ', '#fff', '#36435c')}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }
    // The bar is the viewer's own header, so it is drawn once rather than twice.
    return (
      <DiffViewer
        oldValue={oldText}
        newValue={newText}
        title={`\u25be ${t('CONFIG_HISTORY_CONTENT')}\u3000\u203a`}
        description={t('COMPARE_WITH', { version: `#${pair.comparedRevision}` })}
      />
    );
  };

  return (
    <div style={{ padding: '8px 24px 24px' }} data-test="config-history-page">
      <p style={{ color: '#79879c', fontSize: 12, lineHeight: 1.6, margin: '0 0 16px' }}>
        {t('CONFIG_HISTORY_HINT')}
      </p>

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
                  // The native cards in this console carry this shadow; measured from the page's own
                  // property panel and content card, both 4px radius with this exact shadow.
                  boxShadow: '0 4px 8px rgba(36, 46, 66, 0.06)',
                  cursor: 'pointer',
                  background: '#fff',
                }}
              >
                {/* The design gives every record a round mark on the left. */}
                <span
                  style={{
                    width: 30,
                    height: 30,
                    flex: '0 0 30px',
                    borderRadius: '50%',
                    border: '2px solid #b6c2cd',
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 6,
                      width: 2,
                      height: 9,
                      background: '#b6c2cd',
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: 14,
                      width: 6,
                      height: 2,
                      background: '#b6c2cd',
                    }}
                  />
                </span>
                <strong>#{record.revision}</strong>
                <span
                  style={{
                    fontSize: 11,
                    padding: '2px 10px',
                    borderRadius: 4,
                    background: managedByColors(record.managedBy).background,
                    color: managedByColors(record.managedBy).color,
                  }}
                >
                  {t(managedByLabelKey(record.managedBy))}
                </span>
                <span style={{ color: '#79879c', fontSize: 12 }}>
                  {formatTime(record.createdAt)}
                  {record.managedByRef ? ` · ${record.managedByRef}` : ''}
                </span>
                {record.contentOmitted && (
                  <span style={{ color: '#f5a623', fontSize: 12 }}>
                    {t('CONFIG_HISTORY_CONTENT_OMITTED')}
                  </span>
                )}
                {/* The design puts a chevron at the right end: down when open, right when closed. */}
                <span style={{ marginLeft: 'auto', color: '#b6c2cd', fontSize: 16 }}>
                  {isOpen ? '⌄' : '›'}
                </span>
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
                  <div style={{ overflowX: 'auto' }}>{renderDiff(record)}</div>
                </div>
              )}
            </div>
          );
        })}

      {!loading && !failed && records.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            background: '#fdf1f4',
            border: '1px solid #f1d6dc',
            borderRadius: 4,
            color: '#8c4a58',
            fontSize: 12,
            lineHeight: 1.85,
          }}
        >
          {t('CONFIG_HISTORY_SOURCE_NOTE')}
        </div>
      )}
    </div>
  );
}

export default ConfigHistoryPage;
