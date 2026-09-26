/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import styled from 'styled-components';
import { Card } from '@kubed/components';
import { useParams } from 'react-router-dom';
import {
  Column,
  DataTable,
  formatTime,
  openpitrixStore,
  StatusIndicator,
} from '@ks-console/shared';

const StyledCard = styled(Card)`
  & > div:nth-child(2) {
    padding: 0;
  }
`;

const { getRepoEventsUrl } = openpitrixStore;

function Events(): JSX.Element {
  const { workspace, repoId } = useParams();
  const columns: Column[] = [
    {
      title: t('CREATION_TIME_TCAP'),
      field: 'lastTimestamp',
      width: '24%',
      render: lastTimestamp =>
        lastTimestamp ? formatTime(lastTimestamp, `YYYY-MM-DD HH:mm:ss`) : '-',
    },
    {
      title: t('STATUS'),
      field: 'type',
      width: '16%',
      render: type => (
        <StatusIndicator type={type === 'Warning' ? 'warning' : 'success'}>
          {type || '-'}
        </StatusIndicator>
      ),
    },
    {
      title: t('REASON'),
      field: 'reason',
      width: '20%',
    },
    {
      title: t('MESSAGE'),
      field: 'message',
      render: message => message || '-',
    },
  ];

  return (
    <StyledCard sectionTitle={t('EVENT_PL')}>
      <DataTable
        tableName="events"
        // @ts-ignore TODO
        url={getRepoEventsUrl(workspace || 'system-workspace', repoId || '')}
        rowKey="metadata.uid"
        columns={columns}
        format={item => item}
        showFooter={false}
        showToolbar={false}
      />
    </StyledCard>
  );
}

export default Events;
