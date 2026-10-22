/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isEmpty, get } from 'lodash';
import { DeleteConfirmModal, useCacheStore as useStore } from '@ks-console/shared';
import { useDisclosure } from '@kubed/hooks';
import { Loading, notify } from '@kubed/components';
import { Pen, TimedTask, Restart, Firewall, Trash, Storage } from '@kubed/icons';
import {
  RecreateModal,
  workloadStore,
  useWebSocket,
  hpaStore,
  DetailPagee,
  getDisplayName,
  formatTime,
  useCommonActions,
  hasClusterModule,
  ClusterAliasName,
  ProjectAliasName,
  request,
} from '@ks-console/shared';
import { useRollbackModal, useAutoScalingModal } from '../../../../../../clusters/hooks/useModal';
import type { FormattedWorkload } from '@ks-console/shared';
import { WorkloadSettingsModal } from '../../../../../components/WorkloadCreateModal';

const module = 'deployments';
const WORKLOAD_TYPE = 'DEPLOYMENT';
const store = workloadStore(module);
const { usePatchHpaMutation } = hpaStore;

const DeploymentDetail = () => {
  const authKey = module;
  const params = useParams();
  const { workspace, cluster, namespace, name } = params;
  const navigate = useNavigate();
  const [settingsResource, setSettingsResource] = useState<Record<string, any>>();
  const {
    useGetDetail,
    useUpdateDeploymentMutation,
    useRollbackMutation,
    useDeleteDeploymentMutation,
  } = store;

  const k8sVersion = globals.clusterConfig?.[cluster!]?.k8sVersion;

  const {
    data: detail,
    isLoading,
    isError,
    refetch,
  } = useGetDetail({
    cluster,
    name,
    namespace,
  });

  useWebSocket({
    module,
    url: store.getWatchListUrl({ cluster, namespace }),
    params: { fieldSelector: `metadata.name=${name}` },
    enabled: Boolean(cluster && namespace && name) && !isError,
    onMessage: () => refetch(),
  });

  const [sharedDetail, setDetailProps] = useStore('DeploymentDetailProps', {
    module,
    detail: {},
    isLoading: false,
    isError: false,
  });

  const listUrl = useMemo(() => {
    return workspace
      ? `/${workspace}/clusters/${cluster}/projects/${namespace}/deployments`
      : `/clusters/${cluster}/deployments`;
  }, [workspace, cluster, namespace]);

  const tabs = useMemo(() => {
    const prefix = workspace
      ? `/${workspace}/clusters/${cluster}/projects/${namespace}`
      : `/clusters/${cluster}/projects/${namespace}`;
    const path = `${prefix}/deployments/${name}`;

    return cluster && hasClusterModule(cluster, 'whizard-monitoring')
      ? [
          { title: t('RESOURCE_STATUS'), path: `${path}/resource-status` },
          { title: t('REVISION_RECORDS'), path: `${path}/revision-control` },
          { title: t('METADATA'), path: `${path}/metadata` },
          { title: t('MONITORING'), path: `${path}/monitors` },
          { title: t('ENVIRONMENT_VARIABLE_PL'), path: `${path}/env` },
          { title: t('CONFIG_REFERENCE'), path: `${path}/config-reference` },
          { title: t('EVENT_PL'), path: `${path}/events` },
        ]
      : [
          { title: t('RESOURCE_STATUS'), path: `${path}/resource-status` },
          { title: t('REVISION_RECORDS'), path: `${path}/revision-control` },
          { title: t('METADATA'), path: `${path}/metadata` },
          { title: t('ENVIRONMENT_VARIABLE_PL'), path: `${path}/env` },
          { title: t('CONFIG_REFERENCE'), path: `${path}/config-reference` },
          { title: t('EVENT_PL'), path: `${path}/events` },
        ];
  }, [workspace, cluster, namespace, name]);

  const isCustomScaling = useMemo(() => {
    const labels = get(detail, 'labels', {});
    return Object.keys(labels).includes('autoscaling.kubeshpere.io/name');
  }, [detail]);

  const attrs = useMemo(() => {
    if (isEmpty(detail)) {
      return [];
    }

    const { app, createTime, updateTime, creator } = detail;

    return [
      {
        label: t('CLUSTER'),
        value: <ClusterAliasName cluster={cluster} />,
      },
      {
        label: t('PROJECT'),
        value: <ProjectAliasName project={namespace} />,
      },
      {
        label: t('APP'),
        value: app ? app : '-',
      },
      {
        label: t('CREATION_TIME_TCAP'),
        value: formatTime(createTime),
      },
      {
        label: t('UPDATE_TIME_TCAP'),
        value: formatTime(updateTime),
      },
      {
        label: t('CREATOR'),
        value: creator,
      },
    ];
  }, [detail, cluster, namespace]);

  const { editBaseInfo, editYaml } = useCommonActions({
    store,
    params: {
      cluster,
      namespace: detail?.namespace,
      name: detail?.name,
    },
    callback: (type: string) => {
      switch (type) {
        case 'delete':
          navigate(listUrl);
          break;
        default:
          refetch();
      }
    },
  });

  const {
    open: openRecreateModal,
    close: closeRecreateModal,
    isOpen: recreateModalIsOpen,
  } = useDisclosure();

  const {
    open: openSettingsModal,
    close: closeSettingsModal,
    isOpen: settingsModalIsOpen,
  } = useDisclosure();

  const {
    open: openDeleteModal,
    close: closeDeleteModal,
    isOpen: deleteModalIsOpen,
  } = useDisclosure();

  const { mutate: mutateRecreateOpt, isLoading: recreateIsLoading } = useUpdateDeploymentMutation({
    onSuccess: () => {
      notify.success(t('RECREATE_SUCCESS_DESC'));
      closeRecreateModal();
      refetch();
    },
  });
  const {
    mutate: mutateSettings,
    isLoading: settingsIsLoading,
    error: settingsError,
    reset: resetSettings,
  } = store.usePutMutation(undefined, {
    noGetDetail: true,
    onSuccess: () => {
      notify.success(t('UPDATE_SUCCESSFUL'));
      closeSettingsModal();
      refetch();
    },
  });
  const { mutate: mutateDeleteOpt, isLoading: deleteIsLoading } = useDeleteDeploymentMutation(
    {
      onSuccess: () => {
        notify.success(t('DELETED_SUCCESSFULLY'));
        closeDeleteModal();
        navigate(listUrl);
      },
    },
    k8sVersion,
  );

  const { renderRollbackModal, setRollbackVisible } = useRollbackModal<
    FormattedWorkload['_originData']
  >({
    module,
    detail,
    data: detail?._originData,
    usePatchMutation: useRollbackMutation(
      {
        cluster,
        name,
        namespace,
      },
      {
        onSuccess: () => {
          notify.success(t('ROLLBACK_SUCCESSFUL'));
          setRollbackVisible(false);
          refetch();
        },
      },
    ),
  });

  const { renderAutoScalingModal, setScaleVisible } = useAutoScalingModal<
    FormattedWorkload['_originData']
  >({
    module,
    detail,
    data: detail?._originData,
    mutateUpdateDeploymentMutation: useUpdateDeploymentMutation({
      onSuccess: () => {
        notify.success(t('UPDATE_SUCCESSFUL'));
        setScaleVisible(false);
        refetch();
      },
    }),
    usePatchMutation: usePatchHpaMutation(
      {
        cluster,
        name,
        namespace,
      },
      {
        onSuccess: () => {
          notify.success(t('UPDATE_SUCCESSFUL'));
          setScaleVisible(false);
          refetch().then(({ data }) => {
            setDetailProps({
              ...sharedDetail,
              detail: data,
            });
          });
        },
      },
    ),
  });

  useEffect(() => {
    setDetailProps({ module, detail, isLoading, isError });
  }, [detail, isLoading, isError, setDetailProps]);

  const isExtensionEnabledInCluster = hasClusterModule(cluster!, 'metrics-server');
  const actions = () => {
    return [
      {
        key: 'edit',
        icon: <Pen />,
        text: t('EDIT_INFORMATION'),
        action: 'edit',
        show: true,
        onClick: () => {
          editBaseInfo(detail);
        },
      },
      {
        key: 'rollBack',
        icon: <TimedTask />,
        text: t('ROLL_BACK'),
        action: 'edit',
        show: true,
        onClick: () => {
          setRollbackVisible(true);
        },
      },
      {
        key: 'editHpa',
        icon: <Firewall />,
        text: t('EDIT_AUTOSCALING'),
        show: Boolean(isExtensionEnabledInCluster),
        disabled: isCustomScaling,
        action: 'edit',
        onClick: () => {
          setScaleVisible(true);
        },
      },
      {
        key: 'editConfigTemplate',
        icon: <Storage />,
        text: t('EDIT_SETTINGS'),
        action: 'edit',
        show: !detail.isFedManaged,
        onClick: async () => {
          try {
            // The formatted detail deliberately omits resourceVersion and ownerReferences.
            // Edit a raw snapshot so concurrent updates return 409 instead of being overwritten.
            const resource = await request.get<Record<string, any>, Record<string, any>>(
              store.getDetailUrl({ cluster, namespace, name }),
            );
            setSettingsResource(resource);
            resetSettings();
            openSettingsModal();
          } catch {
            notify.error(t('WORKLOAD_SETTINGS_LOAD_FAILED'));
          }
        },
      },
      {
        key: 'editYaml',
        icon: <Pen />,
        text: t('EDIT_YAML'),
        action: 'edit',
        show: !detail.isFedManaged,
        onClick: () => editYaml(detail),
      },
      {
        key: 'redeploy',
        icon: <Restart />,
        text: t('RECREATE'),
        action: 'edit',
        show: !detail.isFedManaged,
        onClick: () => {
          openRecreateModal();
        },
      },
      {
        key: 'delete',
        icon: <Trash />,
        text: t('DELETE'),
        action: 'delete',
        show: !detail.isFedManaged,
        onClick: () => openDeleteModal(),
      },
    ];
  };

  const handleRecreate = () => {
    mutateRecreateOpt({
      params: {
        cluster,
        namespace: detail?.namespace,
        name: detail?.name,
      },
      data: {
        spec: {
          template: {
            metadata: {
              annotations: {
                'kubesphere.io/restartedAt': new Date(),
              },
            },
          },
        },
      },
    });
  };

  return (
    <>
      {isLoading || isError ? (
        <Loading className="page-loading" />
      ) : (
        <DetailPagee
          tabs={tabs}
          cardProps={{
            name: getDisplayName(detail),
            authKey,
            params: { cluster, namespace, name },
            desc: get(detail, 'description', ''),
            actions: actions(),
            attrs,
            breadcrumbs: {
              label: t('DEPLOYMENT_PL'),
              url: listUrl,
            },
          }}
        />
      )}
      {renderRollbackModal()}
      {renderAutoScalingModal()}
      {settingsModalIsOpen && settingsResource && (
        <WorkloadSettingsModal
          visible
          cluster={cluster!}
          namespace={namespace!}
          resource={settingsResource}
          confirmLoading={settingsIsLoading}
          error={settingsError}
          onOk={data =>
            mutateSettings({
              params: { cluster, namespace, name },
              data,
            })
          }
          onCancel={closeSettingsModal}
        />
      )}
      {recreateModalIsOpen && (
        <RecreateModal
          name={detail?.name}
          type={WORKLOAD_TYPE}
          visible={recreateModalIsOpen}
          confirmLoading={recreateIsLoading}
          onOk={handleRecreate}
          onCancel={() => closeRecreateModal()}
        />
      )}
      {deleteModalIsOpen && (
        <DeleteConfirmModal
          visible={deleteModalIsOpen}
          type={WORKLOAD_TYPE}
          resource={detail.name}
          confirmLoading={deleteIsLoading}
          onOk={() => {
            mutateDeleteOpt({
              cluster,
              name: detail.name,
              namespace: detail.namespace,
              annotations: detail.annotations,
            });
          }}
          onCancel={() => closeDeleteModal()}
        ></DeleteConfirmModal>
      )}
    </>
  );
};

export default DeploymentDetail;
