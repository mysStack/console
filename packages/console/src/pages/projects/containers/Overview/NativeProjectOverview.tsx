import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from 'react-query';
import { Button, Card, Field, Loading, Select } from '@kubed/components';
import { Project } from '@kubed/icons';
import {
  ClusterAliasName,
  FormattedNamespace,
  getDisplayName,
  getSuitableValue,
  hasClusterModule,
  hasKSModule,
  hasPermission,
  limitRangesStore,
  quotaStore,
  request,
  openpitrixStore,
  useUrl,
} from '@ks-console/shared';
import ResourceStatus from '../../../clusters/containers/Projects/detail/ResourceStatus';
import { useQueryProjectLimitRanges } from '../../../clusters/stores/project';
import { useProjectEditDefaultQuotasModal } from '../../../clusters/containers/Projects/hooks/useProjectModals';
import { useProjectEditQuotasModal } from '../../../../actions/project';
import { ModalProvider } from '../../../../components/useModal/ModalProvider';
import { getProjectResourceHref, getScopedWorkloadRank, ProjectScope } from './nativeOverviewModel';

const rankMetrics = [
  'workload_cpu_usage',
  'workload_memory_usage_wo_cache',
  'workload_net_bytes_transmitted',
  'workload_net_bytes_received',
];
const metricUnits = ['cpu', 'memory', 'bandwidth', 'bandwidth'];
const workloadRoutes: Record<string, string> = {
  Deployment: 'deployments',
  StatefulSet: 'statefulsets',
  DaemonSet: 'daemonsets',
};

function ProjectRank({ scope }: { scope: ProjectScope }) {
  const [metric, setMetric] = useState(rankMetrics[0]);
  const query = useQuery(
    ['nativeProjectOverviewRank', scope, metric],
    () =>
      request.get<never, any>('kapis/monitoring.kubesphere.io/v1beta1/workload_metrics', {
        params: {
          cluster: scope.cluster,
          namespace: scope.namespace,
          namespaces_filter: scope.namespace,
          type: 'rank',
          limit: 10,
          sort_type: 'desc',
          sort_metric: metric,
          metrics_filter: [...rankMetrics, 'replica'].join('|'),
        },
        headers: { 'x-ignore-error-notify': true },
      }),
    { retry: false },
  );
  const rows = getScopedWorkloadRank(query.data, metric, scope);
  return (
    <Card className="mb12" data-test="native-overview-rank">
      <h3>{t('RESOURCE_USAGE_RANKING')}</h3>
      <Select
        value={metric}
        options={rankMetrics.map(value => ({ value, label: t('SORT_BY_' + value.toUpperCase()) }))}
        onChange={setMetric}
      />
      {query.isLoading ? (
        <Loading />
      ) : query.isError ? (
        <p>{t('FAILED')}</p>
      ) : !rows.length ? (
        <p>{t('NO_DATA')}</p>
      ) : (
        rows.map((row, index) => {
          const resource = workloadRoutes[row.kind];
          return (
            <div
              key={row.kind + ':' + row.name + ':' + index}
              style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}
            >
              <div>
                {resource ? (
                  <Link
                    to={
                      getProjectResourceHref(scope, resource) + '/' + encodeURIComponent(row.name)
                    }
                  >
                    {row.name}
                  </Link>
                ) : (
                  row.name
                )}
                <div>{t(row.kind)}</div>
              </div>
              <strong>
                {getSuitableValue(row.value, metricUnits[rankMetrics.indexOf(metric)], '-')}
              </strong>
            </div>
          );
        })
      )}
    </Card>
  );
}

function ProjectApps({ scope }: { scope: ProjectScope }) {
  const query = useQuery(
    ['nativeProjectOverviewApps', scope],
    () =>
      request.get<never, any>(openpitrixStore.getApplicationUrl(scope), {
        params: { limit: 3 },
        headers: { 'x-ignore-error-notify': true },
      }),
    { retry: false },
  );
  const items = Array.isArray(query.data?.items) ? query.data.items : [];
  if (!items.length) return null;
  const prefix = getProjectResourceHref(scope, 'applications/template');
  return (
    <Card className="mb12">
      <h3>{t('INSTALLED_APPS')}</h3>
      {items.slice(0, 3).map((item: any) => {
        const name = item.metadata?.name || item.name;
        return name ? (
          <div key={name}>
            <Link to={prefix + '/' + encodeURIComponent(name)}>
              {getDisplayName(item.metadata ? { ...item, ...item.metadata } : item)}
            </Link>
          </div>
        ) : null;
      })}
      <Link to={prefix}>{t('VIEW_MORE')}</Link>
    </Card>
  );
}

function QuotaReminders({ scope, detail }: { scope: ProjectScope; detail: FormattedNamespace }) {
  const { cluster, namespace, workspace } = scope;
  const quotas = useQuery(
    ['nativeProjectOverviewQuotas', cluster, namespace],
    () => quotaStore.fetchListByK8s({ cluster, namespace }),
    { retry: false },
  );
  const limits = useQueryProjectLimitRanges({ cluster, namespace });
  const { openWithDeps: openQuota, close: closeQuota } = useProjectEditQuotasModal({
    deps: { data: detail },
  });
  const { openWithDeps: openLimits, close: closeLimits } = useProjectEditDefaultQuotasModal({
    deps: { limitranges: limits.data, data: detail },
  });
  const showQuota = quotas.isSuccess && Array.isArray(quotas.data) && quotas.data.length === 0;
  const showLimits = limits.isSuccess && Array.isArray(limits.data) && limits.data.length === 0;
  return (
    <>
      {showQuota && (
        <Card className="mb12">
          <h3>{t('PROJECT_QUOTAS_NOT_SET')}</h3>
          <p>{t('PROJECT_QUOTAS_DESC')}</p>
          <Button
            onClick={() =>
              openQuota(({ data: project }) => [
                { store: quotaStore, detail: project },
                {
                  detail: project,
                  params: { cluster, namespace, workspace, name: namespace },
                  onSuccess: () => {
                    closeQuota();
                    quotas.refetch();
                  },
                },
              ])
            }
          >
            {t('EDIT_QUOTAS')}
          </Button>
        </Card>
      )}
      {showLimits && (
        <Card className="mb12">
          <h3>{t('DEFAULT_CONTAINER_QUOTAS_NOT_SET')}</h3>
          <p>{t('DEFAULT_CONTAINER_QUOTAS_DESC')}</p>
          <Button
            onClick={() =>
              openLimits(({ limitranges, data: project }) => [
                { detail: limitranges?.[0], params: scope, workspace, store: limitRangesStore },
                {
                  params: scope,
                  detail: limitranges?.[0],
                  projectDetail: project,
                  onSuccess: () => {
                    closeLimits();
                    limits.refetch();
                  },
                },
              ])
            }
          >
            {t('EDIT_QUOTAS')}
          </Button>
        </Card>
      )}
    </>
  );
}

function OverviewContent() {
  const params = useParams<'workspace' | 'cluster' | 'namespace'>();
  const scope = {
    workspace: params.workspace || '',
    cluster: params.cluster || '',
    namespace: params.namespace || '',
  };
  const { workspace, cluster, namespace } = scope;
  const detail = useQueryClient().getQueryData<FormattedNamespace>([
    'project',
    'detail',
    cluster,
    namespace,
    workspace,
  ]);
  const docsMembers = useUrl({ module: 'project_members' }).getDocsUrl();
  const docsGateway = useUrl({ module: 'internet' }).getDocsUrl();
  if (!workspace || !cluster || !namespace || !detail || detail.name !== namespace)
    return <Loading className="page-loading" />;
  const canEdit = hasPermission({
    workspace,
    cluster,
    project: namespace,
    module: 'project-settings',
    action: 'edit',
  });
  return (
    <div data-test="native-project-overview" data-project={namespace}>
      <h2 className="mb12">{t('OVERVIEW')}</h2>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(240px,1fr)', gap: 12 }}
      >
        <section>
          <Card className="mb12" data-test="native-overview-base">
            <Field
              avatar={<Project size={40} />}
              value={getDisplayName(detail)}
              label={detail.description || '-'}
            />
            <div style={{ display: 'flex', gap: 24, marginTop: 20 }}>
              <Field label={t('CLUSTER')} value={<ClusterAliasName cluster={cluster} />} />
              <Field
                label={t('WORKSPACE')}
                value={<Link to={'/workspaces/' + workspace + '/overview'}>{workspace}</Link>}
              />
              <Field label={t('CREATOR')} value={detail.creator || '-'} />
            </div>
          </Card>
          {canEdit && (
            <QuotaReminders key={cluster + '/' + namespace} scope={scope} detail={detail} />
          )}
          {hasKSModule('openpitrix') && <ProjectApps scope={scope} />}
          <ResourceStatus
            enablePhysical
            resourceLink={(module, status) => getProjectResourceHref(scope, module, status)}
          />
        </section>
        <aside>
          {(docsMembers || docsGateway) && (
            <Card className="mb12">
              <h3>{t('TIPS')}</h3>
              {docsMembers && (
                <p>
                  <a href={docsMembers} target="_blank" rel="noreferrer noopener">
                    {t('HOW_TO_INVITE_USERS')}
                  </a>
                </p>
              )}
              {docsGateway && (
                <p>
                  <a href={docsGateway} target="_blank" rel="noreferrer noopener">
                    {t('HOW_TO_SET_PROJECT_GATEWAY')}
                  </a>
                </p>
              )}
            </Card>
          )}
          {!!hasClusterModule(cluster, 'whizard-monitoring') && (
            <ProjectRank key={cluster + '/' + namespace} scope={scope} />
          )}
        </aside>
      </div>
    </div>
  );
}

export default function NativeProjectOverview() {
  return (
    <ModalProvider>
      <OverviewContent />
    </ModalProvider>
  );
}
