/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useRef } from 'react';
import { merge } from 'lodash';
import { notify } from '@kubed/components';
import { useDisclosure } from '@kubed/hooks';
import { useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';

import {
  Icon,
  formatTime,
  DetailPage,
  DetailPageRef,
  serviceAccountStore,
  useCommonActions,
} from '@ks-console/shared';
import type { FormattedServiceAccount } from '@ks-console/shared';

import { NAME } from '../../../../clusters/containers/Configuration/ServiceAccounts/constants';
import ModifyServiceAccountRole from '../../../../clusters/containers/Configuration/ServiceAccounts/ModifyRole';

function ServiceAccountDetail(): JSX.Element {
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const { module, usePatchMutation } = serviceAccountStore;
  const ref = useRef<DetailPageRef<FormattedServiceAccount>>(null);
  const editRoleModal = useDisclosure();
  const listPrefix = workspace
    ? `/${workspace}/clusters/${cluster}/projects/${namespace}/serviceaccounts`
    : `/clusters/${cluster}/serviceaccounts`;
  const tabs = [{ path: 'detail', title: t('DATA') }];
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  const handleBack = () => {
    if (
      navigationType === 'PUSH' &&
      location.key !== 'default' &&
      location.pathname.endsWith('/detail')
    ) {
      navigate(-1);
      return;
    }
    navigate(listPrefix);
  };

  const attrs = (data: FormattedServiceAccount) => [
    { label: t('CLUSTER_PL'), value: cluster || '' },
    { label: t('PROJECT_PL'), value: data?.namespace },
    { label: t('ROLE_PL'), value: data?.role },
    {
      label: t('CREATION_TIME_TCAP'),
      value: data?.createTime ? formatTime(data.createTime) : '',
    },
    { label: t('CREATOR'), value: data?.creator || '' },
  ];

  const { editBaseInfo, editYaml, del } = useCommonActions({
    store: serviceAccountStore,
    params: { cluster, name, namespace },
    callback: (action: string) => {
      if (action === 'delete') {
        navigate(listPrefix);
      } else {
        ref.current?.refetch();
      }
    },
  });

  const { mutate: mutateEditRole, isLoading: isEditRoleLoading } = usePatchMutation(
    {},
    {
      onSuccess: () => {
        editRoleModal.close();
        notify.success(t('UPDATE_SUCCESSFUL'));
        ref.current?.refetch();
      },
    },
  );

  const handleEditRole = (info: object) => {
    const detail = ref.current?.detail;
    mutateEditRole({
      params: { cluster, name: detail?.name, namespace: detail?.namespace },
      data: merge(detail?._originData, info),
    });
  };

  const actions = [
    {
      key: 'edit',
      icon: <Icon name="pen" />,
      text: t('EDIT_INFORMATION'),
      action: 'edit',
      show: true,
      onClick: editBaseInfo,
    },
    {
      key: 'editYaml',
      icon: <Icon name="pen" />,
      text: t('EDIT_YAML'),
      action: 'edit',
      show: true,
      onClick: editYaml,
    },
    {
      key: 'modify',
      icon: <Icon name="pen" />,
      text: t('CHANGE_ROLE'),
      action: 'edit',
      onClick: editRoleModal.open,
    },
    {
      key: 'delete',
      icon: <Icon name="trash" />,
      text: t('DELETE'),
      action: 'delete',
      type: 'danger',
      show: true,
      onClick: (record: FormattedServiceAccount) => del({ ...record, type: NAME }),
    },
  ];

  return (
    <>
      <DetailPage<FormattedServiceAccount>
        ref={ref}
        tabs={tabs}
        authKey={module}
        store={serviceAccountStore}
        params={{ cluster, name, namespace }}
        sideProps={{
          actions,
          attrs,
          icon: <Icon name="client" size={28} style={{ verticalAlign: 'middle' }} />,
          breadcrumbs: {
            label: t('SERVICE_ACCOUNT_PL'),
            url: listPrefix,
            onBack: handleBack,
          },
          description: ref.current?.detail.description,
        }}
      />
      {ref.current?.detail && editRoleModal.isOpen && (
        <ModifyServiceAccountRole
          detail={ref.current.detail}
          visible={true}
          onCancel={editRoleModal.close}
          initialValue={ref.current.detail._originData}
          confirmLoading={isEditRoleLoading}
          onOk={handleEditRole}
        />
      )}
    </>
  );
}

export default ServiceAccountDetail;
