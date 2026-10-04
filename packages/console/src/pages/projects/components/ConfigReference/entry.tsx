import React from 'react';
import styled from 'styled-components';
import { Button } from '@kubed/components';
import { useNavigate, useParams } from 'react-router-dom';

export type ConfigReferenceWorkloadModule = 'deployments' | 'statefulsets' | 'daemonsets';

export interface ConfigReferencePathParams {
  workspace?: string;
  cluster?: string;
  namespace?: string;
  module: ConfigReferenceWorkloadModule;
  name?: string;
}

export function getConfigReferencePath({
  workspace = '',
  cluster = '',
  namespace = '',
  module,
  name = '',
}: ConfigReferencePathParams): string {
  return [
    workspace ? `/${workspace}` : '',
    `/clusters/${cluster}/projects/${namespace}/${module}/${name}/config-reference`,
  ].join('');
}

const Entry = styled.div`
  position: absolute;
  top: 108px;
  left: 292px;
  z-index: 2;

  @media (max-width: 1200px) {
    left: 288px;
  }
`;

export default function ConfigReferenceEntry({
  module,
}: {
  module: ConfigReferenceWorkloadModule;
}) {
  const navigate = useNavigate();
  const { workspace, cluster, namespace, name } = useParams();

  return (
    <Entry>
      <Button
        type="button"
        aria-label={t('CONFIG_REFERENCE')}
        onClick={() =>
          navigate(getConfigReferencePath({ workspace, cluster, namespace, module, name }))
        }
      >
        {t('CONFIG_REFERENCE')}
      </Button>
    </Entry>
  );
}
