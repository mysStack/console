/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Link, useLocation, useParams } from 'react-router-dom';
import { Banner, BannerTip, Button, Field, notify } from '@kubed/components';

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
  useListQueryParams,
} from '../../../hooks';
import { openpitrixStore } from '../../../stores';
import type { Column, TableRef } from '../../DataTable';
import type { RepoData } from '../../../types';
import {
  getRepoStatusState,
  getPendingRepoSyncNames,
  getRepoStatusDisplayState,
  getRepoSyncSummary,
  isRepoSyncInProgress,
} from './syncSummary';
import {
  getRepoManageActionParams,
  getRepoManageAuthKey,
  getRepoManageWorkspace,
} from './repoManageAuth';

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
`;

const { getRepoUrl, useReposDeleteMutation, useRepoSyncMutation } = openpitrixStore;

export function isOCIRepo(record: RepoData): boolean {
  return record.spec.url?.startsWith('oci://') ?? false;
}

export function RepoManage(): JSX.Element {
  const params = useParams();
  const location = useLocation();
  const { workspace = '' } = params;
  const repoListUrl = getRepoUrl({ workspace });
  const tableRef = useRef<TableRef>();
  const syncPollingTimer = useRef<number>();
  const [modalType, setModalType] = useState<string>('');
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

  const handleRepoDataChange = useCallback((records: RepoData[]) => {
    setPendingRepoSyncNames(names => getPendingRepoSyncNames(names, records));
  }, []);

  function triggerRepoSync(repoName: string, mode?: 'full'): Promise<void> {
    return syncRepo({ repo_name: repoName, mode }).then(() => {
      setPendingRepoSyncNames(names => (names.includes(repoName) ? names : [...names, repoName]));
      notify.success(t('SYNC_REPOSITORY_TRIGGERED'));
      tableRef.current?.refetch();
    });
  }

  function isWorkspaceRepo(val: any) {
    return (
      val.metadata.labels['kubesphere.io/workspace'] === getRepoManageWorkspace(workspace) ||
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
        show: isWorkspaceRepo,
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
        show: record => isWorkspaceRepo(record) && isOCIRepo(record),
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
        show: isWorkspaceRepo,
        onClick: (_, record) => {
          setSelectedRows([record]);
          setModalType('edit');
        },
      },
      {
        key: 'delete',
        icon: <Icon name="trash" />,
        text: t('DELETE'),
        show: isWorkspaceRepo,
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
      width: '15%',
      render: (status = 'syncing', record) => {
        const state = getRepoStatusState(status as string | { state?: string });
        const displayState = getRepoStatusDisplayState(state);
        const summary = getRepoSyncSummary(record?.status?.sync, state);
        return (
          <>
            {/* @ts-ignore TODO */}
            <StatusIndicator type={displayState}>
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
      width: '45%',
    },
    {
      title: t('TYPE'),
      field: 'workspace',
      width: '45%',
      render: (_, record) => {
        const isSystem =
          record.metadata?.labels?.['kubesphere.io/workspace'] === 'system-workspace';
        return t(isSystem ? 'SYSTEM_REPO_TYPE' : 'OWNER_REPO_TYPE');
      },
    },
    {
      id: 'more',
      title: '',
      width: '15%',
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
    const formattedParams = useListQueryParams({
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
      <Banner
        className="mb12"
        icon={<Icon name="catalog" />}
        title={t('APP_REPO')}
        description={t('APP_REPO_DESC')}
      >
        <BannerTip title={t('HOW_TO_USE_APP_REPO_Q')} key="develop">
          {t('HOW_TO_USE_APP_REPO_A')}
        </BannerTip>
      </Banner>
      <DataTable
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
