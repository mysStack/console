/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Loading, Tag, TypeSelect } from '@kubed/components';
import { DiffViewer } from '@kubed/diff-viewer';
import { Icon } from '@ks-console/shared';
import styled from 'styled-components';

import Text from '../../../clusters/components/Text';
import { DiffWrapper, YamlHeader } from '../../../clusters/components/RevisionControl/styles';

import {
  HistoryRecord,
  managedByFromAnnotations,
  MANAGED_BY_DIRECT,
  MANAGED_BY_HELM,
  MANAGED_BY_REPLICATOR,
  decodeHistoryPayload,
  diffPair,
  buildSimpleDiffRows,
  historySecretName,
  SimpleDiffRow,
  sortHistoryRecords,
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

const HistoryDiff = styled.div`
  overflow-x: auto;

  .d2h-wrapper {
    min-width: 720px;
  }
`;

const HistoryMeta = styled(YamlHeader)`
  display: grid;
  grid-template-columns: repeat(3, minmax(160px, max-content));
  column-gap: 56px;
  row-gap: 16px;
  align-items: start;
  padding: 4px 8px 20px;

  & > div {
    min-width: 160px;
    margin-right: 0;
  }

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(140px, 1fr));
    column-gap: 24px;

    & > div {
      min-width: 140px;
    }
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

function SimpleDiffTable({ rows, description }: { rows: SimpleDiffRow[]; description: string }) {
  const oldRows = rows.filter(row => row.type !== 'insert');
  const newRows = rows.filter(row => row.type !== 'delete');
  const oldStart = oldRows[0]?.oldLine || 1;
  const newStart = newRows[0]?.newLine || 1;
  const background = {
    context: '#fff',
    insert: '#c4e8d3',
    delete: '#f9dfe4',
  } as const;
  const color = {
    context: '#36435c',
    insert: '#36435c',
    delete: '#36435c',
  } as const;
  return (
    <div style={{ border: '1px solid #ccd3db', borderRadius: '4px', overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          minHeight: 40,
          padding: '0 12px',
          background: '#eff4f9',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <Icon name="terminal" size={20} />
        <span style={{ marginLeft: 8 }}>{t('CONFIG_FILE')}</span>
        <span style={{ marginLeft: 8, fontSize: 18 }}>⌄</span>
        <span style={{ marginLeft: 8, fontSize: 18 }}>›</span>
        <span style={{ marginLeft: 'auto' }}>{description}</span>
      </div>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: MONO,
          fontSize: 12,
          lineHeight: 1.67,
        }}
      >
        <tbody>
          <tr>
            <td
              colSpan={2}
              style={{ padding: '4px 12px', color: '#a8b3c0', background: '#f9fbfd' }}
            >
              {`@@ -${oldStart},${oldRows.length} +${newStart},${newRows.length} @@`}
            </td>
          </tr>
          {rows.map((row, index) => (
            <tr key={`${row.type}-${row.oldLine || ''}-${row.newLine || ''}-${index}`}>
              <td
                style={{
                  width: 64,
                  padding: '0 8px',
                  color: '#a8b3c0',
                  textAlign: 'right',
                  background: '#fafbfc',
                  whiteSpace: 'pre',
                }}
              >
                <span style={{ display: 'inline-block', width: 28 }}>{row.oldLine || ''}</span>
                <span style={{ display: 'inline-block', width: 28 }}>{row.newLine || ''}</span>
              </td>
              <td
                style={{
                  padding: '0 12px',
                  color: color[row.type],
                  background: background[row.type],
                  whiteSpace: 'pre',
                }}
              >
                <strong style={{ display: 'inline-block', width: 18 }}>
                  {row.type === 'insert' ? '+' : row.type === 'delete' ? '-' : ' '}
                </strong>
                {row.text}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function managedByTagColor(managedBy: string): 'success' | 'info' | 'secondary' {
  if (managedBy === MANAGED_BY_REPLICATOR) {
    return 'success';
  }
  if (managedBy === MANAGED_BY_HELM) {
    return 'info';
  }
  return 'secondary';
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
  const [selectedRevision, setSelectedRevision] = useState<number | undefined>();

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
      attemptedUrl = [
        `/clusters/${cluster}/api/v1/namespaces/${namespace}/secrets`,
        historySecretName(name),
      ].join('/');
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
        setSelectedRevision(undefined);
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
        setSelectedRevision(undefined);
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
      // The newest record is the current state, so it is selected by default in the version menu.
      setSelectedRevision(sortHistoryRecords(loaded)[0]?.revision);
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
      return <Alert showIcon={false}>{t('CONFIG_HISTORY_FIRST_REVISION')}</Alert>;
    }
    const oldText = pair.oldValue || '';
    const newText = pair.newValue || '';
    const simpleRows = buildSimpleDiffRows(oldText, newText);
    if (simpleRows) {
      return (
        <SimpleDiffTable
          rows={simpleRows}
          description={t('COMPARE_WITH', { version: `#${pair.comparedRevision}` })}
        />
      );
    }
    // The bar is the viewer's own header, so it is drawn once rather than twice.
    return (
      <HistoryDiff>
        <DiffViewer
          oldValue={oldText}
          newValue={newText}
          title={t('CONFIG_FILE')}
          description={t('COMPARE_WITH', { version: `#${pair.comparedRevision}` })}
        />
      </HistoryDiff>
    );
  };

  const sortedRecords = sortHistoryRecords(records);
  const selectedRecord = records.find(record => record.revision === selectedRevision);
  const revisionOptions = sortedRecords.map(record => ({
    label: (
      <span>
        <span>#{record.revision}</span>{' '}
        <Tag color={managedByTagColor(record.managedBy)}>
          {t(managedByLabelKey(record.managedBy))}
        </Tag>
        {record.contentOmitted && <Tag color="warning">{t('CONFIG_HISTORY_CONTENT_OMITTED')}</Tag>}
      </span>
    ),
    description: formatTime(record.createdAt),
    icon: <Icon name="timed-task" size={40} />,
    value: record.revision,
  }));

  return (
    <div style={{ padding: '12px 24px 28px' }} data-test="config-history-page">
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

      {!loading && !failed && (
        <Card sectionTitle={t('REVISION_RECORDS')}>
          <Alert className="mb12" showIcon={false}>
            {t('CONFIG_HISTORY_HINT')}
          </Alert>
          {records.length > 0 ? (
            <TypeSelect
              options={revisionOptions}
              defaultValue={selectedRevision}
              onChange={(revision: number) => setSelectedRevision(revision)}
            />
          ) : (
            <div style={{ color: '#79879c' }}>{t('CONFIG_HISTORY_EMPTY')}</div>
          )}
        </Card>
      )}

      {!loading && !failed && selectedRecord && (
        <Card className="mt12">
          <HistoryMeta>
            <Text title={`#${selectedRecord.revision}`} description={t('CONFIG_HISTORY_SERIAL')} />
            <Text
              title={formatTime(selectedRecord.createdAt)}
              description={t('CONFIG_HISTORY_CHANGED_AT')}
            />
            <Text
              title={`${t(managedByLabelKey(selectedRecord.managedBy))}${
                selectedRecord.managedByRef
                  ? t('CONFIG_HISTORY_SOURCE_VERSION_FORMAT', {
                      version: selectedRecord.managedByRef,
                    })
                  : ''
              }`}
              description={t('CONFIG_HISTORY_MANAGED_BY')}
            />
          </HistoryMeta>
          <DiffWrapper style={{ overflowX: 'auto' }}>{renderDiff(selectedRecord)}</DiffWrapper>
        </Card>
      )}

      {!loading && !failed && records.length > 0 && (
        <Alert className="mt12" showIcon={false}>
          {t('CONFIG_HISTORY_SOURCE_NOTE')}
        </Alert>
      )}
    </div>
  );
}

export default ConfigHistoryPage;
