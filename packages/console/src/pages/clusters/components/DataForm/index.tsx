/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { forwardRef, useEffect, useRef, useState, Ref, useImperativeHandle } from 'react';
import { trim } from 'lodash';

import { Form, FormItem, Input, InputPassword, useForm } from '@kubed/components';
import AutoSizeTextarea from 'react-textarea-autosize';

import { Icon, safeBtoa } from '@ks-console/shared';
import { useCacheStore as useStore } from '@ks-console/shared';
import { DefaultWrapper, FormWrapper } from './styles';
import { DataFormRef } from '../SecretSettings';
import { getEditableDataValue, getSubmittedDataValue } from '../DataList/dataListUtils';

interface Props {
  selectKey: string;
  [propName: string]: any;
}

interface FormValues {
  key: string;
  value: string;
}

function SecretDataForm(
  { detail, selectKey, onCancel, onOk, module }: Props,
  ref: Ref<DataFormRef>,
) {
  const [, setSecretChanged] = useStore<'true'>('secretChanged');

  const formRef = useRef(null);

  const [form] = useForm<FormValues>();

  const getFormData = () => {
    return {
      key: selectKey || '',
      value: getEditableDataValue(detail[selectKey], module),
    };
  };
  const [formData] = useState(getFormData());

  useEffect(() => {
    setSecretChanged('true');
  }, []);

  const handleGoBack = () => {
    onCancel();
  };

  const handleSubmit = (callback: Function) => {
    form.validateFields().then((data: any) => {
      const { key, value } = data;

      const nextValue = getSubmittedDataValue(detail[selectKey], value, module);
      onOk({
        [trim(key)]: module === 'configmaps' ? nextValue : value ? safeBtoa(value) : nextValue,
      });
      if (callback) {
        callback();
      }
    });
  };

  useImperativeHandle(ref, () => {
    return {
      handleSubmit,
    };
  });

  return (
    <DefaultWrapper>
      <h6>
        <a className="custom-icon" onClick={handleGoBack}>
          <Icon name={'return'} />
        </a>
        {!detail[selectKey] ? t('ADD_DATA_TCAP') : t('EDIT_DATA_TCAP')}
      </h6>
      <FormWrapper>
        <Form initialValues={formData} ref={formRef} form={form}>
          <FormItem label={t('DATA_KEY')} name={'key'}>
            <Input />
          </FormItem>
          <FormItem label={t('DATA_VALUE')} name={'value'}>
            {module === 'configmaps' ? (
              <AutoSizeTextarea rows={4} style={{ width: '100%' }} />
            ) : (
              <InputPassword autoComplete="new-password" />
            )}
          </FormItem>
        </Form>
      </FormWrapper>
    </DefaultWrapper>
  );
}

export default forwardRef(SecretDataForm);
