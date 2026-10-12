/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useRef } from 'react';
import { merge, omit } from 'lodash';
import { notify } from '@kubed/components';
import { useDisclosure } from '@kubed/hooks';
import { useNavigate, useParams } from 'react-router-dom';

import {
  Icon,
  formatTime,
  DetailPage,
  DetailPageRef,
  configMapStore,
  useCommonActions,
} from '@ks-console/shared';
import type { FormattedConfigMap } from '@ks-console/shared';

import ConfigMapEditModal from '../../../../clusters/components/ConfigMapEditModal';

export default function ConfigMapDetail(): JSX.Element {
  const { module } = configMapStore;
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const configMapSettingEditModal = useDisclosure();
  const ref = useRef<DetailPageRef<FormattedConfigMap>>(null);
  const prefix = workspace
    ? `/${workspace}/clusters/${cluster}/projects/${namespace}`
    : `/clusters/${cluster}/configmaps`;
  const tabs = [
    { path: 'detail', title: t('DATA') },
    { path: 'revision-control', title: t('CONFIG_HISTORY_TITLE') },
    { path: 'metadata', title: t('METADATA') },
    { path: 'events', title: t('EVENTS_PL') },
  ];

  const navigate = useNavigate();

  const attrs = (data: FormattedConfigMap) => [
    { label: t('CLUSTER_PL'), value: cluster ? cluster : '' },
    { label: t('PROJECT_PL'), value: data?.namespace },
    {
      label: t('CREATION_TIME_TCAP'),
      value: data?.createTime ? formatTime(data?.createTime) : '',
    },
    {
      label: t('CREATOR'),
      value: data?.creator || '',
    },
  ];

  const callback = () => {
    navigate(prefix);
  };

  const { editBaseInfo, editYaml, del } = useCommonActions({
    store: configMapStore,
    params: { cluster, name, namespace },
    callback: (action: string) => {
      if (action === 'delete') {
        callback();
      } else {
        ref.current?.refetch();
      }
    },
  });

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
      key: 'editConfigMap',
      icon: <Icon name="pen" />,
      text: t('EDIT_SETTINGS'),
      action: 'edit',
      onClick: configMapSettingEditModal.open,
    },
    {
      key: 'delete',
      icon: <Icon name="trash" />,
      text: t('DELETE'),
      action: 'delete',
      type: 'danger',
      show: true,
      onClick: (record: FormattedConfigMap) => del({ ...record, type: 'CONFIGMAP' }),
    },
  ];

  const { usePutMutation: useConfigMapPutMutation } = configMapStore;
  const { mutate: mutateConfigMapSettingEdit, isLoading: isEditConfigMapLoading } =
    useConfigMapPutMutation(
      {},
      {
        onSuccess: () => {
          configMapSettingEditModal.close();
          notify.success(t('UPDATE_SUCCESSFUL'));
          ref.current?.refetch();
        },
      },
    );

  const handleEditConfigMap = (info: object) => {
    const detailData = ref.current?.detail;
    const data = merge(omit(detailData?._originData, 'data'), info);

    mutateConfigMapSettingEdit({
      params: {
        name: detailData?.name,
        namespace: detailData?.namespace,
        cluster,
      },
      data,
    });
  };

  return (
    <>
      <DetailPage<FormattedConfigMap>
        ref={ref}
        tabs={tabs}
        store={configMapStore}
        authKey={module}
        params={{ cluster, name, namespace }}
        sideProps={{
          actions,
          attrs,
          icon: <Icon name="hammer" size={28} style={{ verticalAlign: 'middle' }} />,
          breadcrumbs: {
            label: t('CONFIGMAP_PL'),
            url: prefix,
            listName: 'configuration-configmap',
          },
          description: ref.current?.detail.description,
        }}
      />
      {ref.current?.detail && configMapSettingEditModal.isOpen && (
        <ConfigMapEditModal
          visible={true}
          isSubmitting={isEditConfigMapLoading}
          onOk={handleEditConfigMap}
          onCancel={configMapSettingEditModal.close}
          isFederated={false}
          disableSelect={true}
          detail={ref.current?.detail}
          cluster={cluster}
        />
      )}
    </>
  );
}
