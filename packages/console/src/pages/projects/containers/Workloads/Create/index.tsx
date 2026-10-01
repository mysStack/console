import React, { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, notify } from '@kubed/components';
import { workloadStore } from '@ks-console/shared';

import WorkloadForm from '../../../components/WorkloadForm/WorkloadForm';
import { toWorkloadManifest } from '../../../components/WorkloadForm/workloadTemplate';
import { createEmptyWorkloadForm } from '../../../components/WorkloadForm/formModel';
import { getWorkloadPath, getWorkloadTitle } from '../routeConfig';
import type { WorkloadKind } from '../../../components/WorkloadForm/types';

const STORES = {
  deployments: workloadStore('deployments'),
  statefulsets: workloadStore('statefulsets'),
  daemonsets: workloadStore('daemonsets'),
} as const;

export default function WorkloadCreate({ kind }: { kind: WorkloadKind }) {
  const { workspace = '', cluster = '', namespace = '' } = useParams();
  const navigate = useNavigate();
  const store = STORES[kind];
  const initialValue = useMemo(() => createEmptyWorkloadForm(kind), [kind]);
  const { mutate, isLoading, isError } = store.usePostMutation(
    { cluster, namespace },
    {
      onSuccess: () => {
        notify.success('创建成功');
        navigate(getWorkloadPath({ workspace, cluster, namespace }, kind));
      },
    },
  );

  return (
    <Card>
      <h1>{getWorkloadTitle(kind, 'create')}</h1>
      {isError && <div role="alert">工作负载创建失败</div>}
      <WorkloadForm
        kind={kind}
        cluster={cluster}
        namespace={namespace}
        initialValue={initialValue}
        submitting={isLoading}
        onCancel={() => navigate(getWorkloadPath({ workspace, cluster, namespace }, kind))}
        onSubmit={values => mutate({ data: toWorkloadManifest(values, kind) })}
      />
    </Card>
  );
}
