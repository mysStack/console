/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useState, useRef } from 'react';
import { merge, omit } from 'lodash';
import { useDisclosure } from '@kubed/hooks';
import { useParams, Link } from 'react-router-dom';
import { Tooltip, notify } from '@kubed/components';

import {
  Icon,
  Avatar,
  Column,
  ListPage,
  TableRef,
  formatTime,
  secretStore,
  useActionMenu,
  getDisplayName,
  useCommonActions,
  getSecretYamlEditorValue,
  mergeSecretYaml,
} from '@ks-console/shared';
import type { FormattedSecret } from '@ks-console/shared';

import { NAME, SECRET_TYPES } from '../../../clusters/containers/Configuration/Secrets/constants';
import { SecretEditModal as SecretSettingEditModal } from '../../../clusters/components';
import ConfigResourceCreateModal from '../../components/ConfigResourceCreateModal';

import {
  FedManagedIcon,
  IconsWrapper,
  TooltipTitle,
} from '../../../clusters/containers/Configuration/Secrets/styles';

function Secrets(): JSX.Element {
  const { module, getDocsUrl, usePostMutation, usePutMutation } = secretStore;
  const params = useParams<'cluster' | 'namespace' | 'workspace'>();
  const { cluster, namespace, workspace } = params;
  const projectPrefix = `${workspace ? `/${workspace}` : ''}/clusters/${cluster}/projects`;
  const docUrl = getDocsUrl();
  const tableRef = useRef<TableRef<FormattedSecret>>(null);
  const secretSettingEditModal = useDisclosure();
  const createSecretModal = useDisclosure();
  const [activeRecord, setActiveRecord] = useState<FormattedSecret>();
  const { mutate: mutateSecretCreate, isLoading: isCreateSecretLoading } = usePostMutation(
    {},
    {
      onSuccess: () => {
        createSecretModal.close();
        notify.success(t('CREATE_SUCCESSFUL'));
        tableRef?.current?.refetch();
      },
    },
  );
  const { mutate: mutateSecretSettingEdit, isLoading: isEditSecretLoading } = usePutMutation(
    {},
    {
      onSuccess: () => {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        handleCloseSecretEditModal();
        notify.success(t('UPDATE_SUCCESSFUL'));
        tableRef?.current?.refetch();
      },
    },
  );

  const desc = (
    <div className="banner-desc">
      {t('SECRET_DESC')}
      <Icon name="documentation" size={20} />
      <a href={docUrl} target="_blank">
        {t('LEARN_MORE')}
      </a>
    </div>
  );

  const banner = {
    icon: <Icon name="key" />,
    title: t('SECRET_PL'),
    description: docUrl ? desc : t('SECRET_DESC'),
  };

  const callback = () => {
    tableRef?.current?.refetch();
  };

  const { editBaseInfo, editYaml, del } = useCommonActions({
    store: secretStore,
    params: { cluster },
    callback,
  });

  const editSecretYaml = (record: FormattedSecret) =>
    editYaml({
      initialValues: record,
      yamlValue: getSecretYamlEditorValue(record._originData),
      transformYaml: (data, initialValues) => mergeSecretYaml(initialValues._originData, data),
    });

  const renderItemAction = useActionMenu<FormattedSecret>({
    authKey: module,
    params,
    actions: [
      {
        key: 'edit',
        icon: <Icon name="pen" />,
        text: t('EDIT_INFORMATION'),
        action: 'edit',
        show: row => !row.isFedManaged,
        onClick: editBaseInfo,
      },
      {
        key: 'editYaml',
        icon: <Icon name="pen" />,
        text: t('EDIT_YAML'),
        action: 'edit',
        show: row => !row.isFedManaged,
        onClick: editSecretYaml,
      },
      {
        key: 'editSecret',
        icon: <Icon name="pen" />,
        text: t('EDIT_SETTINGS'),
        action: 'edit',
        show: row => !row.isFedManaged,
        onClick: record => {
          setActiveRecord(record);
          secretSettingEditModal.open();
        },
      },
      {
        key: 'delete',
        icon: <Icon name="trash" />,
        text: t('DELETE'),
        action: 'delete',
        show: row => !row.isFedManaged,
        onClick: record => del({ ...record, type: NAME }),
      },
    ],
  });

  const renderTableActions = useActionMenu({
    authKey: module,
    params,
    autoSingleButton: true,
    actions: [
      {
        key: 'create',
        text: t('CREATE'),
        action: 'create',
        props: {
          color: 'secondary',
          shadow: true,
        },
        onClick: createSecretModal.open,
      },
    ],
  });

  const renderBatchActions = useActionMenu({
    authKey: module,
    params,
    autoSingleButton: true,
    actions: [
      {
        key: 'delete',
        text: t('DELETE'),
        action: 'delete',
        onClick: () => del(tableRef?.current?.getSelectedFlatRows() || []),
        props: {
          color: 'error',
        },
      },
    ],
  });

  const fedManagedIconRender = (): JSX.Element => (
    <Tooltip
      content={
        <>
          <TooltipTitle>{t('MULTI_CLUSTER_PROJECT')}</TooltipTitle>
          <p>{t('MULTI_CLUSTER_PROJECT_TIP')}</p>
        </>
      }
    >
      <FedManagedIcon src="/assets/cluster.svg" />
    </Tooltip>
  );

  const columns: Column[] = [
    {
      title: t('NAME'),
      field: 'name',
      sortable: true,
      searchable: true,
      render: (value, row) => (
        <Avatar
          title={getDisplayName(row)}
          description={row.description || '-'}
          iconSize={40}
          icon={
            <IconsWrapper>
              <Icon name="key" size={40} />
              {row.isFedManaged && fedManagedIconRender()}
            </IconsWrapper>
          }
          to={`${projectPrefix}/${row.namespace}/${module}/${value}`}
        />
      ),
    },
    {
      title: t('PROJECT'),
      field: 'namespace',
      canHide: true,
      width: '16%',
      render: ns => <Link to={`${projectPrefix}/${ns}`}>{ns}</Link>,
    },
    {
      title: t('TYPE'),
      field: 'type',
      canHide: true,
      width: '15%',
      render: type => (type ? (SECRET_TYPES[type] ? t(SECRET_TYPES[type]) : type) : ''),
    },
    {
      title: t('SECRET_FIELD_COUNT'),
      field: 'data',
      canHide: true,
      width: '12%',
      render: data => (data && Object.keys(data)?.length) ?? 0,
    },
    {
      title: t('CREATION_TIME_TCAP'),
      field: 'createTime',
      sortable: true,
      canHide: true,
      width: 180,
      render: time => formatTime(time),
    },
    {
      id: 'more',
      title: ' ',
      width: 20,
      render: (_, record) => renderItemAction(record as FormattedSecret),
    },
  ];

  const table = {
    ref: tableRef,
    columns,
    toolbarRight: renderTableActions({}),
    batchActions: renderBatchActions({}),
  };

  const handleEditSecret = (info: object) => {
    const data = merge(omit(activeRecord?._originData, 'data'), info);

    mutateSecretSettingEdit({
      params: {
        name: activeRecord?.name,
        namespace: activeRecord?.namespace,
      },
      data,
    });
  };

  const handleCloseSecretEditModal = () => {
    secretSettingEditModal.close();
    setActiveRecord(undefined);
  };

  const handleCreateSecret = (data: Record<string, any>) => {
    mutateSecretCreate({
      params: { cluster, namespace: namespace || data.metadata?.namespace },
      data,
    });
  };

  return (
    <>
      <ListPage
        banner={banner}
        table={table}
        store={secretStore}
        hasNamespaceSelector={!namespace}
        getTableUrl={
          namespace ? () => secretStore.getResourceUrl({ cluster, namespace }) : undefined
        }
      />
      {createSecretModal.isOpen && (
        <ConfigResourceCreateModal
          module="secrets"
          visible={true}
          cluster={cluster}
          workspace={workspace}
          namespace={namespace}
          confirmLoading={isCreateSecretLoading}
          onOk={handleCreateSecret}
          onCancel={createSecretModal.close}
        />
      )}
      {activeRecord && secretSettingEditModal.isOpen && (
        <SecretSettingEditModal
          visible={true}
          isSubmitting={isEditSecretLoading}
          onOk={handleEditSecret}
          onCancel={handleCloseSecretEditModal}
          isFederated={false} // todo get isFederated value
          disableSelect={true}
          detail={activeRecord}
          cluster={cluster}
        />
      )}
    </>
  );
}

export default Secrets;
