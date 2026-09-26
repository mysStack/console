/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useState } from 'react';
import { isEmpty } from 'lodash';
import { Appcenter } from '@kubed/icons';
import { Loading, notify } from '@kubed/components';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  DeleteConfirmModal,
  DetailPagee,
  getRepoManageActionParams,
  formatTime,
  getRepoManageAuthKey,
  openpitrixStore,
} from '@ks-console/shared';

import { RepoManagementModal } from '../../../components/Modals';

const { useRepoDetail, useReposDeleteMutation } = openpitrixStore;

const REPO_DETAIL_PATH_PREFIX = `/workspaces/:workspace/repos/:repoId`;

function RepoDetail(): JSX.Element {
  const { workspace = '', repoId = '' } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [modalType, setModalType] = useState<string>('');
  const { data: detail, isLoading, refetch } = useRepoDetail(workspace, repoId);
  const { mutateAsync, isLoading: isDeleting } = useReposDeleteMutation(workspace);
  const tabs = [
    {
      path: `${REPO_DETAIL_PATH_PREFIX}/events`,
      title: 'EVENT_PL',
    },
  ];
  const actions = [
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
    </>
  );
}

export default RepoDetail;
