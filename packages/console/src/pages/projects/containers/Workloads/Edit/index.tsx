import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Loading, notify } from '@kubed/components';
import { workloadStore } from '@ks-console/shared';

import WorkloadForm from '../../../components/WorkloadForm/WorkloadForm';
import {
  toWorkloadForm,
  toWorkloadManifest,
} from '../../../components/WorkloadForm/workloadTemplate';
import { getWorkloadPath, getWorkloadTitle } from '../routeConfig';
import { getWorkloadFormIdentity } from '../../../components/WorkloadForm/formModel';
import type { WorkloadKind } from '../../../components/WorkloadForm/types';

const STORES = {
  deployments: workloadStore('deployments'),
  statefulsets: workloadStore('statefulsets'),
  daemonsets: workloadStore('daemonsets'),
} as const;

export default function WorkloadEdit({ kind }: { kind: WorkloadKind }) {
  const { workspace = '', cluster = '', namespace = '', name = '' } = useParams();
  const navigate = useNavigate();
  const store = STORES[kind];
  const detailQuery = store.useGetDetail({ cluster, namespace, name });
  const {
    mutate,
    isLoading: isSaving,
    isError: isSaveError,
  } = store.usePutMutation(
    { cluster, namespace, name },
    {
      noGetDetail: true,
      onSuccess: () => {
        notify.success('更新成功');
        navigate(getWorkloadPath({ workspace, cluster, namespace }, kind, name));
      },
    },
  );
  const fetchedValue = useMemo(() => {
    if (!detailQuery.data || !kind) return undefined;
    const detail = detailQuery.data as any;
    const original = detail._originData || detail;
    return toWorkloadForm(
      {
        ...original,
        metadata: {
          ...(original.metadata || {}),
          name: detail.name || name,
          resourceVersion: detail.resourceVersion || original.metadata?.resourceVersion,
        },
      },
      kind,
    );
  }, [detailQuery.data, kind, name]);
  const [initialValue, setInitialValue] = useState(fetchedValue);
  const initializedIdentity = useRef('');
  useEffect(() => {
    if (!fetchedValue) return;
    const identity = getWorkloadFormIdentity(fetchedValue);
    if (identity !== initializedIdentity.current) {
      initializedIdentity.current = identity;
      setInitialValue(fetchedValue);
    }
  }, [fetchedValue]);

  if (detailQuery.isLoading) return <Loading />;
  if (detailQuery.isError || !initialValue) return <div role="alert">工作负载加载失败</div>;
  return (
    <Card>
      <h1>{getWorkloadTitle(kind, 'edit')}</h1>
      {isSaveError && <div role="alert">工作负载更新失败</div>}
      <WorkloadForm
        kind={kind}
        cluster={cluster}
        namespace={namespace}
        initialValue={initialValue}
        submitting={isSaving}
        onCancel={() => navigate(getWorkloadPath({ workspace, cluster, namespace }, kind, name))}
        onSubmit={values => mutate({ data: toWorkloadManifest(values, kind) })}
      />
    </Card>
  );
}
