import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, FormItem, Group, Input, useForm } from '@kubed/components';

import EnvFromReferenceList from './EnvFromReferenceList';
import {
  createEmptyWorkloadForm,
  getWorkloadFormIdentity,
  patchEnvVariable,
  validateWorkloadForm,
} from './formModel';
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
  const initializedIdentity = useRef(getWorkloadFormIdentity(values));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [envFromValid, setEnvFromValid] = useState(true);

  useEffect(() => {
    const next = initialValue || createEmptyWorkloadForm(kind);
    const identity = getWorkloadFormIdentity(next);
    if (identity !== initializedIdentity.current) {
      initializedIdentity.current = identity;
      setValues(next);
      setErrors({});
    }
  }, [initialValue, kind]);

  const update = (patch: Partial<WorkloadFormValues>) =>
    setValues(current => ({ ...current, ...patch }));

  const handleSubmit = () => {
    const nextErrors = validateWorkloadForm(values);
    if (!envFromValid && !nextErrors.envFrom)
      nextErrors.envFrom = '配置/密钥引用不可用，请重新选择';
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) onSubmit(values);
  };

  const addEnv = () => update({ env: [...values.env, { name: '', value: '' }] });
  const removeEnv = (index: number) =>
    update({ env: values.env.filter((_, itemIndex) => itemIndex !== index) });
  const changeEnv = (index: number, patch: Record<string, unknown>) =>
    update({
      env: values.env.map((item, itemIndex) =>
        itemIndex === index ? patchEnvVariable(item, patch) : item,
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
            update({
              containerPort: event.target.value ? Number(event.target.value) : undefined,
              clearContainerPort: !event.target.value,
            })
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
      <FormItem label="环境变量">
        <div>
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
        </div>
      </FormItem>
      <FormItem label="配置/密钥引用（envFrom）" help={errors.envFrom}>
        <div>
          <EnvFromReferenceList
            cluster={cluster}
            namespace={namespace}
            value={values.envFrom}
            onChange={envFrom => update({ envFrom })}
            onValidityChange={setEnvFromValid}
          />
        </div>
      </FormItem>
      <Group position="right">
        {onCancel && (
          <Button type="button" onClick={onCancel}>
            取消
          </Button>
        )}
        <Button type="submit" loading={submitting}>
          保存
        </Button>
      </Group>
    </Form>
  );
};

export default WorkloadForm;
