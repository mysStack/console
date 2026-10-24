/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import styled from 'styled-components';
import { Input, InputNumber, Switch } from '@kubed/components';
import { ArrayInput } from '@ks-console/shared';
import type { SecurityContextValues } from './deployment';

const Section = styled.div`
  border: 1px solid #e3e9ef;
  border-radius: 4px;
  padding: 12px;
`;

const Field = styled.label`
  display: block;

  & > span:first-child {
    display: block;
    margin-bottom: 4px;
  }
`;

interface Props {
  kind: 'container' | 'pod';
  value?: SecurityContextValues;
  onChange?: (value?: SecurityContextValues) => void;
}

export default function SecurityContextInput({ kind, value, onChange }: Props) {
  const enabled = value !== undefined;
  const title = t(kind === 'container' ? 'CONTAINER_SECURITY_CONTEXT' : 'POD_SECURITY_CONTEXT');
  const update = (patch: Partial<SecurityContextValues>) => onChange?.({ ...value, ...patch });
  const updateSeLinux = (field: 'level' | 'role' | 'type' | 'user', next: string) =>
    update({ seLinuxOptions: { ...value?.seLinuxOptions, [field]: next } });

  return (
    <Section role="group" aria-label={title}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{title}</strong>
        <Switch
          aria-label={title}
          checked={enabled}
          onChange={checked => onChange?.(checked ? {} : undefined)}
        />
      </div>
      {enabled && (
        <>
          {kind === 'container' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 12,
                marginTop: 12,
              }}
            >
              {(
                [
                  ['privileged', 'PRIVILEGED_MODE'],
                  ['allowPrivilegeEscalation', 'ALLOW_PRIVILEGE_ESCALATION'],
                  ['readOnlyRootFilesystem', 'ROOT_DIRECTORY_READONLY'],
                ] as const
              ).map(([field, label]) => (
                <Switch
                  key={field}
                  label={t(label)}
                  aria-label={t(label)}
                  checked={Boolean(value?.[field])}
                  onChange={checked => update({ [field]: checked })}
                />
              ))}
            </div>
          )}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: 12,
              marginTop: 12,
            }}
          >
            <Switch
              label={t('RUN_AS_NON_ROOT')}
              aria-label={t('RUN_AS_NON_ROOT')}
              checked={Boolean(value?.runAsNonRoot)}
              onChange={runAsNonRoot => update({ runAsNonRoot })}
            />
            <Field>
              <span>{t('USER')}</span>
              <InputNumber
                style={{ width: '100%' }}
                aria-label={t('USER')}
                precision={0}
                value={value?.runAsUser}
                onChange={runAsUser =>
                  update({
                    runAsUser:
                      runAsUser == null || runAsUser === '' ? undefined : Number(runAsUser),
                  })
                }
              />
            </Field>
            <Field>
              <span>{t('USER_GROUP')}</span>
              <InputNumber
                style={{ width: '100%' }}
                aria-label={t('USER_GROUP')}
                precision={0}
                value={value?.runAsGroup}
                onChange={runAsGroup =>
                  update({
                    runAsGroup:
                      runAsGroup == null || runAsGroup === '' ? undefined : Number(runAsGroup),
                  })
                }
              />
            </Field>
          </div>
          <h4>{t('SELINUX_CONTEXT')}</h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: 12,
            }}
          >
            {(['level', 'role', 'type', 'user'] as const).map(field => (
              <Field key={field}>
                <span>{t(field.toUpperCase())}</span>
                <Input
                  aria-label={`${t('SELINUX_CONTEXT')} ${t(field.toUpperCase())}`}
                  value={value?.seLinuxOptions?.[field] || ''}
                  onChange={event => updateSeLinux(field, event.target.value)}
                />
              </Field>
            ))}
          </div>
          {kind === 'container' && (
            <>
              <h4>{t('CAPABILITIES')}</h4>
              {(['add', 'drop'] as const).map(field => (
                <Field key={field}>
                  <span>{t(field.toUpperCase())}</span>
                  <ArrayInput
                    value={value?.capabilities?.[field] || []}
                    addText={t('ADD')}
                    checkItemValid={() => true}
                    aria-label={`${t('CAPABILITIES')} ${t(field.toUpperCase())}`}
                    onChange={items =>
                      update({ capabilities: { ...value?.capabilities, [field]: items } })
                    }
                  >
                    <Input />
                  </ArrayInput>
                </Field>
              ))}
            </>
          )}
        </>
      )}
    </Section>
  );
}
