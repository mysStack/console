import React, { useEffect, useState } from 'react';
import { Button, Form, FormItem, Input, useForm } from '@kubed/components';

import EnvFromReferenceList from './EnvFromReferenceList';
import { createEmptyWorkloadForm, validateWorkloadForm } from './formModel';
import type { WorkloadFormValues, WorkloadKind } from './types';

interface Props {
  kind: WorkloadKind;
  cluster: string;
  namespace: string;
  initialValue?: WorkloadFormValues;
  submitting?: boolean;
  onSubmit: (values: WorkloadFormValues) => void;
  onCancel?: () => void;
}

const WorkloadForm = ({
  kind,
  cluster,
  namespace,
  initialValue,
  submitting,
  onSubmit,
  onCancel,
}: Props) => {
  const [form] = useForm();
  const [values, setValues] = useState<WorkloadFormValues>(
    initialValue || createEmptyWorkloadForm(kind),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues(initialValue || createEmptyWorkloadForm(kind));
    setErrors({});
  }, [initialValue, kind]);

  const update = (patch: Partial<WorkloadFormValues>) =>
    setValues(current => ({ ...current, ...patch }));

  const handleSubmit = () => {
    const nextErrors = validateWorkloadForm(values);
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSubmit(values);
  };

  const addEnv = () => update({ env: [...values.env, { name: '', value: '' }] });
  const removeEnv = (index: number) =>
    update({ env: values.env.filter((_, itemIndex) => itemIndex !== index) });
  const changeEnv = (index: number, patch: Record<string, unknown>) =>
    update({
      env: values.env.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    });

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <FormItem label="名称" required help={errors.name}>
        <Input
          aria-label="名称"
          value={values.name}
          disabled={Boolean(values.resourceVersion)}
          onChange={event => update({ name: event.target.value })}
        />
      </FormItem>
      <FormItem label="镜像" required help={errors.image}>
        <Input
          aria-label="镜像"
          value={values.image}
          onChange={event => update({ image: event.target.value })}
        />
      </FormItem>
      <FormItem label="容器端口">
        <Input
          aria-label="容器端口"
          type="number"
          value={values.containerPort || ''}
          onChange={event =>
            update({ containerPort: event.target.value ? Number(event.target.value) : undefined })
          }
        />
      </FormItem>
      {kind === 'statefulsets' && (
        <FormItem label="Service 名称">
          <Input
            aria-label="Service 名称"
            value={values.serviceName || ''}
            onChange={event => update({ serviceName: event.target.value })}
          />
        </FormItem>
      )}
      <fieldset>
        <legend>环境变量</legend>
        {values.env.map((item, index) => (
          <div key={index}>
            <Input
              aria-label={`环境变量名称 ${index + 1}`}
              value={String(item.name || '')}
              onChange={event => changeEnv(index, { name: event.target.value })}
            />
            <Input
              aria-label={`环境变量值 ${index + 1}`}
              value={String(item.value || '')}
              onChange={event => changeEnv(index, { value: event.target.value })}
            />
            <Button type="button" onClick={() => removeEnv(index)}>
              删除
            </Button>
          </div>
        ))}
        <Button type="button" onClick={addEnv}>
          添加环境变量
        </Button>
      </fieldset>
      <fieldset>
        <legend>配置/密钥引用（envFrom）</legend>
        <EnvFromReferenceList
          cluster={cluster}
          namespace={namespace}
          value={values.envFrom}
          onChange={envFrom => update({ envFrom })}
        />
      </fieldset>
      <div>
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          保存
        </Button>
      </div>
    </Form>
  );
};

export default WorkloadForm;
