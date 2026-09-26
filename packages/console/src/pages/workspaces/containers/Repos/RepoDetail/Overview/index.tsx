import React from 'react';
import { Card, Descriptions, Loading } from '@kubed/components';
import { useParams } from 'react-router-dom';
import { formatTime, openpitrixStore } from '@ks-console/shared';

import { getSyncDiagnosticItems } from './syncDiagnostics';

const { useRepoDetail } = openpitrixStore;

const timeKeys = new Set(['startedAt', 'completedAt']);

function SyncOverview(): JSX.Element {
  const { workspace = '', repoId = '' } = useParams();
  const { data: detail, isLoading } = useRepoDetail(workspace, repoId);
  const items = getSyncDiagnosticItems(detail?.status?.sync).map(item => ({
    label: t(`REPO_SYNC_${item.key.toUpperCase()}`),
    value:
      typeof item.value === 'string' && timeKeys.has(item.key)
        ? formatTime(item.value, 'YYYY-MM-DD HH:mm:ss')
        : item.value,
  }));

  if (isLoading) {
    return <Loading className="page-loading" />;
  }

  return (
    <Card sectionTitle={t('REPO_SYNC_DIAGNOSTICS')}>
      {items.length ? (
        <Descriptions variant="unstyled" data={items} />
      ) : (
        <span>{t('REPO_SYNC_DIAGNOSTICS_EMPTY')}</span>
      )}
    </Card>
  );
}

export default SyncOverview;
