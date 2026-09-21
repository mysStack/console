/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { FormItem, Input, Modal, useForm } from '@kubed/components';
import { Pattern } from '../../../constants';
import { openpitrixStore } from '../../../stores';
import { StyledForm } from './styles';

type Props = {
  visible: boolean;
  workspace: string;
  onCancel: () => void;
  onCreated: (credential: { metadata: { name: string } }) => void;
};

const { useRepoCredentialMutation } = openpitrixStore;

export default function RepoCredentialModal({
  visible,
  workspace,
  onCancel,
  onCreated,
}: Props): JSX.Element {
  const [form] = useForm();
  const { mutate, isLoading } = useRepoCredentialMutation(workspace, {
    onSuccess: credential => {
      form.resetFields();
      onCreated(credential);
    },
  });

  function handleOk() {
    form
      .validateFields()
      .then(values => mutate({ metadata: { name: values.name }, credential: values.credential }));
  }

  return (
    <Modal
      width={480}
      visible={visible}
      title={t('NEW_REPO_CREDENTIAL')}
      onCancel={() => {
        form.resetFields();
        onCancel();
      }}
      onOk={handleOk}
      confirmLoading={isLoading}
    >
      <StyledForm form={form}>
        <FormItem
          name="name"
          label={t('NAME')}
          rules={[
            { required: true, message: t('NAME_EMPTY_DESC') },
            { pattern: Pattern.PATTERN_SERVICE_NAME, message: t('PROJECT_NAME_INVALID_DESC') },
          ]}
        >
          <Input autoFocus />
        </FormItem>
        <FormItem name={['credential', 'username']} label={t('USERNAME')}>
          <Input autoComplete="username" />
        </FormItem>
        <FormItem
          name={['credential', 'password']}
          label={t('PASSWORD_OR_ACCESS_TOKEN')}
          rules={[{ required: true, message: t('PASSWORD_EMPTY_DESC') }]}
        >
          <Input type="password" autoComplete="new-password" />
        </FormItem>
      </StyledForm>
    </Modal>
  );
}
