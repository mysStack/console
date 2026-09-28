/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Button, Field, notify } from '@kubed/components';

import Icon from '../../Icon';
import StatusIndicator from '../../StatusIndicator';
import { DataTable } from '../../DataTable';
import RepoManagementModal from '../../Modals/RepoManagementModal';
import { DeleteConfirmModal } from '../../Modals/DeleteConfirm';
import { InfoConfirmModal } from '../../Modals/InfoConfirm';
import {
  useItemActions,
  useTableActions,
  useBatchActions,
  useListQueryParams as formatListQueryParams,
} from '../../../hooks';
import { openpitrixStore } from '../../../stores';
import type { Column, TableRef } from '../../DataTable';
import type { RepoData } from '../../../types';
import {
  getRepoStatusState,
  getPendingRepoSyncNames,
  getRepoPresentationState,
  getRepoStatusDisplayState,
  getRepoSyncSummary,
  getSuccessfulRepoSyncNames,
  isRepoSyncInProgress,
} from './syncSummary';
import {
  getRepoManageActionParams,
  getRepoManageAuthKey,
  getRepoManageWorkspace,
} from './repoManageAuth';
import { isRepoActionVisible } from './layout';
import { REPOSITORY_SYNC_COMPLETED_EVENT } from '../repoVersionRefresh';

const RepoHeader = styled.section`
  margin-bottom: 12px;
  padding: 16px 20px;
  border: 1px solid ${({ theme }) => theme.palette.accents_2};
  border-radius: 8px;
  background: ${({ theme }) => theme.palette.background};

  @media (max-width: 768px) {
    padding: 14px 16px;
  }
`;
const RepoHeaderMain = styled.div`
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 12px;
`;
const RepoHeaderCopy = styled.div`
  min-width: 0;
`;
const RepoHeaderTitle = styled.h1`
  margin: 0;
  color: ${({ theme }) => theme.palette.accents_8};
  font-size: 20px;
  line-height: 28px;
`;
const RepoHeaderDescription = styled.p`
  margin: 2px 0 0;
  color: ${({ theme }) => theme.palette.accents_5};
  font-size: 13px;
  line-height: 20px;
`;
const RepoHelpToggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 12px 0 0 52px;
  padding: 0;
  border: 0;
  background: transparent;
  color: ${({ theme }) => theme.palette.accents_6};
  font-size: 12px;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: ${({ theme }) => theme.palette.accents_8};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.palette.accents_8};
    outline-offset: 3px;
  }

  @media (max-width: 768px) {
    margin-left: 44px;
  }
`;
const RepoHelpContent = styled.p`
  margin: 8px 0 0 52px;
  color: ${({ theme }) => theme.palette.accents_6};
  font-size: 12px;
  line-height: 18px;
  overflow-wrap: anywhere;

  @media (max-width: 768px) {
    margin-left: 44px;
  }
`;

const AddButton = styled(Button)`
  min-width: 96px;
`;
const Description = styled.div`
  max-width: 300px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;
const SyncSummary = styled.div`
  color: ${({ theme }) => theme.palette.accents_5};
  font-size: 12px;
  margin-top: 4px;
  line-height: 18px;
  overflow-wrap: anywhere;
`;
const RepoUrl = styled.div`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: 20px;
`;
const RepoTable = styled.div`
  .repo-table .table-main > table {
    table-layout: fixed;
  }

  .repo-table .table-main td {
    overflow: hidden;
  }

  @media (max-width: 640px) {
    .repo-table .table-main > table {
      min-width: 0;
    }

    .repo-table .table-main th:nth-child(4),
    .repo-table .table-main td:nth-child(4),
    .repo-table .table-main th:nth-child(5),
    .repo-table .table-main td:nth-child(5) {
      display: none;
    }
  }
`;
const RepoType = styled.div`
  white-space: nowrap;
`;

const { getRepoUrl, useReposDeleteMutation, useRepoSyncMutation } = openpitrixStore;

export function isOCIRepo(record: RepoData): boolean {
  return record.spec?.url?.startsWith('oci://') ?? false;
}

export function RepoManage(): JSX.Element {
  const params = useParams();
  const location = useLocation();
  const { workspace = '' } = params;
  const repoListUrl = getRepoUrl({ workspace });
  const tableRef = useRef<TableRef>();
  const syncPollingTimer = useRef<number>();
  const completedRepoSyncNames = useRef<Set<string>>(new Set());
  const [modalType, setModalType] = useState<string>('');
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedRows, setSelectedRows] = useState<RepoData[]>();
  const [pendingRepoSyncNames, setPendingRepoSyncNames] = useState<string[]>([]);
  const { mutateAsync, isLoading } = useReposDeleteMutation(workspace);
  const { mutateAsync: syncRepo, isLoading: isSyncing } = useRepoSyncMutation(workspace);
  const tableParameters = {
    order: 'creationTimestamp',
    status: 'active',
  };
  const authKey = getRepoManageAuthKey(
    location.search,
    location.hash,
    location.pathname,
    workspace,
  );
  const actionParams = getRepoManageActionParams(authKey, params);

  useEffect(() => {
    if (pendingRepoSyncNames.length === 0) {
      return undefined;
    }

    syncPollingTimer.current = window.setInterval(() => tableRef.current?.refetch(), 3000);
    return () => {
      if (syncPollingTimer.current) {
        window.clearInterval(syncPollingTimer.current);
        syncPollingTimer.current = undefined;
      }
    };
  }, [pendingRepoSyncNames.length]);

  const handleRepoDataChange = useCallback(
    (records: RepoData[]) => {
      getSuccessfulRepoSyncNames(pendingRepoSyncNames, records)
        .filter(repoName => !completedRepoSyncNames.current.has(repoName))
        .forEach(repoName => {
          completedRepoSyncNames.current.add(repoName);
          window.dispatchEvent(
            new CustomEvent(REPOSITORY_SYNC_COMPLETED_EVENT, {
              detail: { repoName },
            }),
          );
        });
      setPendingRepoSyncNames(names => getPendingRepoSyncNames(names, records));
    },
    [pendingRepoSyncNames],
  );

  function triggerRepoSync(repoName: string, mode?: 'full'): Promise<void> {
    completedRepoSyncNames.current.delete(repoName);
    return syncRepo({ repo_name: repoName, mode }).then(response => {
      setPendingRepoSyncNames(names => (names.includes(repoName) ? names : [...names, repoName]));
      notify.success(
        t(
          response?.alreadyRunning
            ? 'SYNC_REPOSITORY_ALREADY_RUNNING'
            : 'SYNC_REPOSITORY_TRIGGERED',
        ),
      );
      tableRef.current?.refetch();
    });
  }

  function isWorkspaceRepo(val: any) {
    return (
      val?.metadata?.labels?.['kubesphere.io/workspace'] === getRepoManageWorkspace(workspace) ||
      location.pathname.includes('/apps-manage/repo')
    );
  }

  const renderItemActions = useItemActions<RepoData>({
    authKey,
    params: actionParams,
    actions: [
      {
        key: 'sync',
        icon: <Icon name="refresh" />,
        text: t('SYNC_REPOSITORY'),
        action: 'edit',
        show: record => isRepoActionVisible('sync', isWorkspaceRepo(record), isOCIRepo(record)),
        disabled: record => isSyncing || isRepoSyncInProgress(record.status?.state),
        onClick: async (_, record) => {
          await triggerRepoSync(record.metadata.name);
        },
      },
      {
        key: 'fullSync',
        icon: <Icon name="refresh" />,
        text: t('FULL_REFRESH_REPOSITORY'),
        action: 'edit',
        show: record => isRepoActionVisible('fullSync', isWorkspaceRepo(record), isOCIRepo(record)),
        disabled: record => isSyncing || isRepoSyncInProgress(record.status?.state),
        onClick: (_, record) => {
          setSelectedRows([record]);
          setModalType('fullSync');
        },
      },
      {
        key: 'edit',
        icon: <Icon name="pen" />,
        text: t('EDIT_INFORMATION'),
        action: 'edit',
        show: record => isRepoActionVisible('edit', isWorkspaceRepo(record), isOCIRepo(record)),
        onClick: (_, record) => {
          setSelectedRows([record]);
          setModalType('edit');
        },
      },
      {
        key: 'delete',
        icon: <Icon name="trash" />,
        text: t('DELETE'),
        show: record => isRepoActionVisible('delete', isWorkspaceRepo(record), isOCIRepo(record)),
        action: 'delete',
        onClick: (_, record) => {
          setSelectedRows([record]);
          setModalType('delete');
        },
      },
    ],
  });

  const renderBatchActions = useBatchActions({
    authKey,
    params: actionParams,
    actions: [
      {
        key: 'delete',
        text: t('DELETE'),
        action: 'delete',
        onClick: () => {
          const selectedFlatRows = tableRef?.current?.getSelectedFlatRows() || [];
          setSelectedRows(selectedFlatRows as any);
          setModalType('delete');
        },
        props: { color: 'error' },
      },
    ],
  });
  const renderTableActions = useTableActions({
    authKey,
    params: actionParams,
    actions: [
      {
        key: 'create',
        text: t('ADD'),
        action: 'manage',
        onClick: () => setModalType('create'),
        props: {
          color: 'secondary',
          shadow: true,
        },
      },
    ],
  });
  const columns: Column<RepoData>[] = [
    {
      title: t('NAME'),
      field: 'name',
      width: '25%',
      searchable: true,
      render: (_, { metadata, spec }) => (
        <Field
          value={
            <Link to={`/workspaces/${getRepoManageWorkspace(workspace)}/repos/${metadata?.name}`}>
              {metadata?.annotations?.['kubesphere.io/alias-name']
                ? `${metadata?.annotations?.['kubesphere.io/alias-name']}（${metadata?.name}）`
                : metadata?.name}
            </Link>
          }
          // value={<Link to={record.metadata.name}>{name}</Link>}
          label={
            // @ts-ignore
            <Description title={spec?.description || '-'}>{spec?.description || '-'}</Description>
          }
          avatar={<Icon name="catalog" size={40} />}
        />
      ),
    },
    {
      title: t('STATUS'),
      field: 'status.state',
      canHide: true,
      width: '20%',
      render: (status = 'syncing', record) => {
        const state = getRepoStatusState(status as string | { state?: string });
        const presentationState = getRepoPresentationState(
          record?.status,
          record?.spec?.syncPeriod,
        );
        const displayState =
          presentationState === 'ready' ? getRepoStatusDisplayState(state) : presentationState;
        const summary = getRepoSyncSummary(record?.status?.sync, state);
        return (
          <>
            {/* @ts-ignore TODO */}
            <StatusIndicator type={displayState === 'stale' ? 'warning' : displayState}>
              {t(`APP_REPO_STATUS_${displayState.toUpperCase()}`)}
            </StatusIndicator>
            {summary && <SyncSummary>{t(summary.key, summary.values)}</SyncSummary>}
          </>
        );
      },
    },
    {
      title: t('URL'),
      field: 'spec.url',
      width: '35%',
      render: url => {
        const repoUrl = typeof url === 'string' ? url : '';
        return <RepoUrl title={repoUrl}>{repoUrl}</RepoUrl>;
      },
    },
    {
      title: t('TYPE'),
      field: 'workspace',
      width: '14%',
      render: (_, record) => {
        const isSystem =
          record.metadata?.labels?.['kubesphere.io/workspace'] === 'system-workspace';
        return <RepoType>{t(isSystem ? 'SYSTEM_REPO_TYPE' : 'OWNER_REPO_TYPE')}</RepoType>;
      },
    },
    {
      id: 'more',
      title: '',
      width: '6%',
      // @ts-ignore TODO
      render: renderItemActions,
    },
  ];

  function serverDataFormatter(serverData: any) {
    return serverData;
  }

  function transformRequestParams(paramData: Record<string, any>): Record<string, any> {
    const { parameters, pageIndex, filters } = paramData;
    const keyword = filters?.[0]?.value;
    const formattedParams = formatListQueryParams({
      ...parameters,
      page: pageIndex + 1,
    });

    if (!keyword) {
      return formattedParams;
    }

    return {
      ...formattedParams,
      name: keyword,
      conditions: formattedParams.conditions + `,keyword=${keyword}`,
    };
  }

  function closeModal(): void {
    setModalType('');
    setSelectedRows(undefined);
  }

  function handleManageOk(): void {
    tableRef.current?.refetch();
    closeModal();
  }

  async function handleRepoDelete(): Promise<void> {
    const reposId: string[] = selectedRows?.map(item => item.metadata.name) || [];
    await mutateAsync(reposId);
    notify.success(t('DELETED_SUCCESSFUL'));
    closeModal();
    tableRef.current?.refetch();
  }

  async function handleFullRepoSync(): Promise<void> {
    const repoName = selectedRows?.[0]?.metadata.name;

    if (!repoName) {
      return;
    }

    await triggerRepoSync(repoName, 'full');
    closeModal();
  }

  return (
    <>
      <RepoHeader>
        <RepoHeaderMain>
          <Icon name="catalog" size={40} />
          <RepoHeaderCopy>
            <RepoHeaderTitle>{t('APP_REPO')}</RepoHeaderTitle>
            <RepoHeaderDescription>{t('APP_REPO_DESC')}</RepoHeaderDescription>
          </RepoHeaderCopy>
        </RepoHeaderMain>
        <RepoHelpToggle
          type="button"
          aria-expanded={isHelpOpen}
          onClick={() => setIsHelpOpen(open => !open)}
        >
          <Icon name="question" size={16} />
          {t('HOW_TO_USE_APP_REPO_Q')}
        </RepoHelpToggle>
        {isHelpOpen && <RepoHelpContent>{t('HOW_TO_USE_APP_REPO_A')}</RepoHelpContent>}
      </RepoHeader>
      <RepoTable>
        <DataTable
          className="repo-table"
          ref={tableRef}
          rowKey="metadata.uid"
          tableName="APP_REPOSITORY"
          url={repoListUrl}
          simpleSearch
          parameters={tableParameters}
          disableRowSelect={val => !isWorkspaceRepo(val)}
          transformRequestParams={transformRequestParams}
          columns={columns}
          useStorageState={false}
          placeholder={t('SEARCH_BY_NAME')}
          toolbarRight={renderTableActions()}
          batchActions={renderBatchActions()}
          // @ts-ignore TODO
          format={item => ({ ...item, workspace })}
          serverDataFormat={serverDataFormatter}
          onChangeData={handleRepoDataChange}
          emptyOptions={{
            withoutTable: true,
            createButton: !!renderTableActions() && (
              <AddButton color="secondary" onClick={() => setModalType('create')}>
                {t('ADD')}
              </AddButton>
            ),
            title: t('NO_APP_REPO_FOUND'),
            image: <Icon name="catalog" size={48} />,
            description: t('APP_REPOSITORY_EMPTY_DESC'),
          }}
        />
      </RepoTable>
      {['create', 'edit'].includes(modalType) && (
        <RepoManagementModal
          visible={true}
          workspace={workspace}
          onCancel={closeModal}
          onOk={handleManageOk}
          detail={selectedRows?.[0]}
        />
      )}
      {modalType === 'delete' && (
        <DeleteConfirmModal
          visible={true}
          type="APP_REPOSITORY"
          resource={selectedRows?.map((item: any) => item.metadata.name)}
          onOk={handleRepoDelete}
          onCancel={closeModal}
          confirmLoading={isLoading}
        />
      )}
      {modalType === 'fullSync' && (
        <InfoConfirmModal
          visible={true}
          title={t('FULL_REFRESH_REPOSITORY_TITLE')}
          content={t('FULL_REFRESH_REPOSITORY_DESC')}
          onOk={handleFullRepoSync}
          onCancel={closeModal}
          confirmLoading={isSyncing}
        />
      )}
    </>
  );
}

export default RepoManage;
