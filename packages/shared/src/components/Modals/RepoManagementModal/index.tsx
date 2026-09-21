/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useMemo, useState } from 'react';
import { get } from 'lodash';
import { Firewall } from '@kubed/icons';
import { useParams } from 'react-router-dom';
import { RuleObject } from 'rc-field-form/lib/interface';
import { Button, FormItem, Input, Modal, Select, useForm, Textarea } from '@kubed/components';
import UrlInput from '../../../components/UrlInput';
import TimeInput from '../../../components/TimeInput';
import { Pattern } from '../../../constants';
import { openpitrixStore } from '../../../stores';
import type { RepoData } from '../../../types';
import { CredentialCard, CredentialStatus, StyledForm } from './styles';
import RepoCredentialModal from './RepoCredentialModal';
import { getCredentialListState } from './credentialState';

type Props = {
  visible: boolean;
  detail?: RepoData;
  onOk?: () => void;
  onCancel?: () => void;
};

const { useRepoMutation, useRepoCredentials } = openpitrixStore;
function RepoManagementModal({ visible, detail, onCancel, onOk }: Props): JSX.Element {
  const [form] = useForm();
  const { workspace = '' } = useParams();

  const {
    data: credentialsData,
    isError: isCredentialsError,
    isLoading: isCredentialsLoading,
    refetch: refetchCredentials,
  } = useRepoCredentials(workspace);

  const getType = useMemo(() => {
    let type = 'https';
    if (detail && detail.spec.url) {
      const matches = detail.spec.url.match(/^(.*):\/\//);
      if (matches?.[1]) {
        type = matches[1];
      }
    }
    return type;
  }, [detail]);

  function getFormData(data: any) {
    const labels = { 'kubesphere.io/workspace': workspace || 'system-workspace' };
    const global = workspace ? undefined : true;
    return {
      apiVersion: 'application.kubesphere.io/v2',
      kind: 'HelmRepo',
      ...data,
      metadata: {
        ...data?.metadata,
        name: data?.metadata.name || '',
        labels,
      },
      spec: {
        ...data?.spec,
        global,
        name: data?.spec.name || data?.metadata.name || '',
        syncPeriod: get(data?.spec, 'syncPeriod', 0),
        url: data?.spec.url || '',
      },
    };
  }

  const initFormData = getFormData(detail);
  const [currentFormData, setCurrentFormData] = useState<RepoData>(initFormData);
  const [credentialModalVisible, setCredentialModalVisible] = useState(false);
  const [createdCredential, setCreatedCredential] = useState<{ metadata: { name: string } }>();
  const [isUrlValidated, setIsUrlValidated] = useState(false);
  const urlFormData = {
    url: currentFormData.spec.url,
    credential: '{}',
    type: getType,
  };
  const { mutate, isLoading } = useRepoMutation(workspace, {
    onSuccess: () => onOk?.(),
  });

  function timeValidator(rule: RuleObject, value: string, callback: (error?: string) => void) {
    const data = +value;
    const time = /^[0-9]*$/;

    if (!data) {
      return callback();
    }

    if (!time.test(data.toString())) {
      return callback(t('SYNC_INTERVAL_INVALID'));
    }

    if (data !== 0 && (data > 86400 || data < 180)) {
      return callback(t('SYNC_INTERVAL_TIP'));
    }

    callback();
  }

  function handleUrlChange(url: string): void {
    const forms = { ...currentFormData };
    forms.spec.url = url;
    setCurrentFormData(forms);
    setIsUrlValidated(false);
  }

  function handleValuesChange(values: any): void {
    setCurrentFormData(prevFormData => ({
      ...prevFormData,
      metadata: {
        ...prevFormData.metadata,
        ...values.metadata,
        name: detail?.metadata.name || values?.spec?.name,
      },
      spec: {
        ...prevFormData.spec,
        ...values.spec,
      },
    }));
  }

  function handleCredentialChange(name?: string) {
    setCurrentFormData(prev => ({
      ...prev,
      spec: {
        ...prev.spec,
        credentialSecretRef: name ? { name } : undefined,
      },
    }));
    setIsUrlValidated(false);
  }

  const credentials = [
    ...(createdCredential ? [createdCredential] : []),
    ...(credentialsData?.items || []),
  ].filter(
    (credential, index, all) =>
      all.findIndex(item => item.metadata.name === credential.metadata.name) === index,
  );

  const credentialOptions = [
    { label: t('NO_REPO_CREDENTIAL'), value: '' },
    ...credentials.map((credential: { metadata: { name: string } }) => ({
      label: credential.metadata.name,
      value: credential.metadata.name,
    })),
  ];
  const credentialListState = getCredentialListState(
    isCredentialsLoading,
    isCredentialsError,
    credentials.length,
  );

  function handleOk(): void {
    form.validateFields().then(() => {
      const params = { ...currentFormData };
      if (params.spec.name && !params.metadata.name) {
        params.metadata.name = params.spec.name;
      }
      if (!isUrlValidated) {
        return;
      }
      if (detail?.metadata.name) {
        // params.metadata.annotations = {
        //   'kubesphere.io/alias-name': currentFormData.spec.name,
        // };
        return mutate({ params, repo_name: detail.metadata.name });
      }

      return mutate({ params });
    });
  }

  return (
    <Modal
      width="min(691px, calc(100vw - 32px))"
      visible={visible}
      onOk={handleOk}
      onCancel={onCancel}
      titleIcon={<Firewall size={20} />}
      title={t(detail ? 'EDIT_APP_REPO' : 'ADD_APP_REPO')}
      confirmLoading={isLoading}
      okButtonProps={{ disabled: !isUrlValidated }}
    >
      <StyledForm form={form} initialValues={initFormData} onValuesChange={handleValuesChange}>
        <FormItem
          name={['spec', 'name']}
          label={t('NAME')}
          rules={[
            { required: true, message: t('NAME_EMPTY_DESC') },
            {
              pattern: Pattern.PATTERN_SERVICE_NAME,
              message: t('PROJECT_NAME_INVALID_DESC'),
            },
          ]}
        >
          <Input autoFocus={true} disabled={!!detail?.metadata.name} />
        </FormItem>
        <FormItem name={['metadata', 'annotations', 'kubesphere.io/alias-name']} label={t('ALIAS')}>
          <Input />
        </FormItem>
        <UrlInput
          formData={currentFormData}
          urlFormData={urlFormData}
          onChange={handleUrlChange}
          onValidate={setIsUrlValidated}
          validationKey={`${currentFormData.spec.url || ''}:${
            currentFormData.spec.credentialSecretRef?.name || ''
          }`}
          isSubmitting={isLoading}
        />
        <FormItem label={t('ACCESS_CREDENTIAL')}>
          <CredentialCard>
            <span>🔒</span>
            {credentialListState === 'ready' ? (
              <Select
                className="credential-select"
                value={currentFormData.spec.credentialSecretRef?.name || ''}
                options={credentialOptions}
                onChange={(value: string) => handleCredentialChange(value || undefined)}
              />
            ) : (
              <CredentialStatus
                role={credentialListState === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {credentialListState === 'loading' && t('LOADING_REPO_CREDENTIALS')}
                {credentialListState === 'empty' && t('NO_REPO_CREDENTIALS')}
                {credentialListState === 'error' && t('LOAD_REPO_CREDENTIALS_FAILED')}
              </CredentialStatus>
            )}
            {credentialListState === 'error' && (
              <Button variant="text" onClick={() => void refetchCredentials()}>
                {t('RETRY')}
              </Button>
            )}
            <Button variant="text" onClick={() => setCredentialModalVisible(true)}>
              {t('NEW_REPO_CREDENTIAL')}
            </Button>
          </CredentialCard>
        </FormItem>
        <FormItem
          name={['spec', 'syncPeriod']}
          label={t('SYNC_INTERVAL')}
          help={t('SYNC_INTERVAL_DESC')}
          rules={[
            { required: true, message: t('SYNC_PERIOD_EMPTY_DESC') },
            { validator: timeValidator },
          ]}
        >
          <TimeInput hideSeconds />
        </FormItem>
        <FormItem
          name={['spec', 'description']}
          label={t('DESCRIPTION')}
          help={t('DESCRIPTION_DESC')}
        >
          <Textarea maxLength={256} />
        </FormItem>
      </StyledForm>
      <RepoCredentialModal
        visible={credentialModalVisible}
        workspace={workspace}
        onCancel={() => setCredentialModalVisible(false)}
        onCreated={credential => {
          setCreatedCredential(credential);
          handleCredentialChange(credential.metadata.name);
          setCredentialModalVisible(false);
          void refetchCredentials();
        }}
      />
    </Modal>
  );
}

export default RepoManagementModal;
