/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect, useState } from 'react';
import { isEmpty } from 'lodash';
import { Appcenter } from '@kubed/icons';
import { Loading, notify } from '@kubed/components';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  DeleteConfirmModal,
  DetailPagee,
  InfoConfirmModal,
  getRepoManageActionParams,
  formatTime,
  getRepoManageAuthKey,
  openpitrixStore,
} from '@ks-console/shared';

import { RepoManagementModal } from '../../../components/Modals';
import { getRepoDetailActionKeys, isRepoSyncInProgress } from './repoDetailActions';

const { useRepoDetail, useReposDeleteMutation, useRepoSyncMutation } = openpitrixStore;

const REPO_DETAIL_PATH_PREFIX = `/workspaces/:workspace/repos/:repoId`;

function RepoDetail(): JSX.Element {
  const { workspace = '', repoId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [modalType, setModalType] = useState<string>('');
  const { data: detail, isLoading, refetch } = useRepoDetail(workspace, repoId);
  const { mutateAsync, isLoading: isDeleting } = useReposDeleteMutation(workspace);
  const { mutateAsync: syncRepo, isLoading: isSyncing } = useRepoSyncMutation(workspace);
  const isOCIRepo = detail?.spec?.url?.startsWith('oci://') ?? false;
  const detailActionKeys = getRepoDetailActionKeys(isOCIRepo);

  useEffect(() => {
    if (!isRepoSyncInProgress(detail?.status?.state)) {
      return undefined;
    }

    const timer = window.setInterval(() => refetch(), 3000);
    return () => window.clearInterval(timer);
  }, [detail?.status?.state, refetch]);

  async function handleSync(mode?: 'full'): Promise<void> {
    if (isSyncing || isRepoSyncInProgress(detail?.status?.state)) {
      return;
    }

    const response = await syncRepo({ repo_name: repoId, mode });
    notify.success(
      t(response?.alreadyRunning ? 'SYNC_REPOSITORY_ALREADY_RUNNING' : 'SYNC_REPOSITORY_TRIGGERED'),
    );
    await refetch();
  }
  const tabs = [
    {
      path: `${REPO_DETAIL_PATH_PREFIX}/overview`,
      title: t('REPO_SYNC_DIAGNOSTICS'),
    },
    {
      path: `${REPO_DETAIL_PATH_PREFIX}/events`,
      title: t('EVENT_PL'),
    },
  ];
  const actions = [
    {
      key: 'sync',
      type: 'control',
      text: t('SYNC_REPOSITORY'),
      action: 'edit',
      onClick: () => handleSync(),
      show: detailActionKeys.includes('sync'),
      props: {
        color: 'secondary',
        shadow: true,
        disabled: isSyncing || isRepoSyncInProgress(detail?.status?.state),
      },
    },
    {
      key: 'fullSync',
      type: 'control',
      text: t('FULL_REFRESH_REPOSITORY'),
      action: 'edit',
      onClick: () => setModalType('fullSync'),
      show: detailActionKeys.includes('fullSync'),
      props: {
        color: 'secondary',
        shadow: true,
        disabled: isSyncing || isRepoSyncInProgress(detail?.status?.state),
      },
    },
    {
      key: 'edit',
      type: 'control',
      text: t('EDIT'),
      action: 'edit',
      onClick: () => setModalType('edit'),
      show: true,
      props: {
        color: 'secondary',
        shadow: true,
      },
    },
    {
      key: 'delete',
      type: 'danger',
      text: t('DELETE'),
      action: 'delete',
      onClick: () => setModalType('delete'),
      show: true,
      props: {
        color: 'error',
        shadow: true,
      },
    },
  ];
  const authKey = getRepoManageAuthKey('', '', location.pathname, workspace);
  const actionParams = getRepoManageActionParams(authKey, { workspace });

  function getAttrs() {
    if (isEmpty(detail)) {
      return;
    }

    return [
      {
        label: t('CREATION_TIME_TCAP'),
        value: formatTime(detail?.createTime, `YYYY-MM-DD HH:mm:ss`),
      },
      {
        label: t('CREATOR'),
        value: detail?.creator || '-',
      },
    ];
  }

  function closeModal(): void {
    setModalType('');
  }

  function handleEditRepo(): void {
    refetch();
    closeModal();
  }

  async function handleDelete(): Promise<void> {
    await mutateAsync([repoId]);
    closeModal();
    notify.success(t('DELETED_SUCCESSFUL'));
    navigate(`/workspaces/${workspace}/repos`);
  }

  async function handleFullRepoSync(): Promise<void> {
    await handleSync('full');
    setModalType('');
  }

  if (isLoading) {
    return <Loading className="page-loading" />;
  }

  return (
    <>
      <DetailPagee
        tabs={tabs}
        cardProps={{
          name: detail?.name,
          desc: detail?.description,
          authKey,
          icon: <Appcenter size={28} />,
          attrs: getAttrs(),
          actions,
          params: actionParams,
          breadcrumbs: {
            label: t('APP_REPOSITORY_PL'),
            url: `/workspaces/${workspace}/repos`,
          },
        }}
      />
      {modalType === 'edit' && (
        <RepoManagementModal
          visible={true}
          onCancel={closeModal}
          onOk={handleEditRepo}
          detail={detail}
        />
      )}
      {modalType === 'delete' && (
        <DeleteConfirmModal
          type="APP"
          visible={true}
          resource={detail?.name}
          onOk={handleDelete}
          onCancel={closeModal}
          confirmLoading={isDeleting}
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

export default RepoDetail;
