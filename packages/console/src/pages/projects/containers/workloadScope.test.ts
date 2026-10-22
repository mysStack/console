import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import React from 'react';
import ts from 'typescript';

// Execute the real page function. Replace hooks and browser-only components at
// their boundaries so these tests inspect the scope sent to actions and rows.
function inspectList(directory: string) {
  const params = { cluster: 'member-one', workspace: 'team-a', namespace: 'project-a' };
  const actionScopes: Record<string, any> = {};
  const mutationCallbacks: (() => void)[] = [];
  let refreshes = 0;
  const source = ts.transpileModule(
    readFileSync(path.join(__dirname, directory, 'index.tsx'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const Empty = () => null;
  const DataTable = () => null;
  const store = {
    mapper: (item: any) => ({ name: item.metadata.name, namespace: item.metadata.namespace }),
    getResourceUrl: () => 'workloads',
    getWatchListUrl: () => 'watch-workloads',
    useUpdateDeploymentMutation: (options: any) => {
      mutationCallbacks.push(options.onSuccess);
      return {};
    },
    useDeleteDeploymentMutation: (options: any) => {
      mutationCallbacks.push(options.onSuccess);
      return {};
    },
    useBatchDeleteWorkloadMutation: (options: any) => {
      mutationCallbacks.push(options.onSuccess);
      return {};
    },
    useBatchStopDeploymentMutation: (options: any) => {
      mutationCallbacks.push(options.onSuccess);
      return {};
    },
    useCreateWorkloadMutation: (options: any) => {
      mutationCallbacks.push(options.onSuccess);
      return {};
    },
  };
  const shared = {
    workloadStore: () => store,
    DataTable,
    Icon: Empty,
    StatusReason: Empty,
    getDisplayName: (item: any) => item.name,
    getWorkloadStatus: (item: any) => ({ status: 'warning', reason: item.statusReason || '' }),
    useTableActions: ({ params: scope }: any) => {
      actionScopes.table = scope;
      return Empty;
    },
    useBatchActions: ({ params: scope }: any) => {
      actionScopes.batch = scope;
      return Empty;
    },
    useItemActions: ({ params: scope }: any) => {
      actionScopes.item = scope;
      return Empty;
    },
  };
  const module = { exports: {} as any };
  runInNewContext(source, {
    module,
    exports: module.exports,
    t: (key: string) => key,
    require: (name: string) => {
      if (name === 'react') {
        return {
          ...React,
          useRef: () => ({ current: { refetch: () => refreshes++ } }),
          useState: (value: unknown) => [value, () => {}],
        };
      }
      if (name === 'react-router-dom') return { useParams: () => params, Link: Empty };
      if (name === '@kubed/hooks') {
        return { useDisclosure: () => ({ isOpen: false, open: () => {}, close: () => {} }) };
      }
      if (name === '@ks-console/shared') return shared;
      if (name === '@kubed/components') return { Field: Empty, notify: { success: () => {} } };
      return Empty;
    },
  });
  const view = module.exports.default();
  const table = view.props.children.find((child: any) => child?.type === shared.DataTable);
  return { actionScopes, table, mutationCallbacks, getRefreshCount: () => refreshes };
}

for (const resource of ['Deployments', 'StatefulSets', 'DaemonSets']) {
  test(`${resource} successful mutations refresh the current list`, () => {
    const { mutationCallbacks, getRefreshCount } = inspectList(resource);
    const expectedCallbackCount = resource === 'Deployments' ? 7 : 6;
    assert.equal(mutationCallbacks.length, expectedCallbackCount);
    for (const onSuccess of mutationCallbacks) {
      const before = getRefreshCount();
      onSuccess();
      assert.equal(getRefreshCount(), before + 1);
    }
  });

  test(`${resource} list uses project permissions for every action group`, () => {
    const { actionScopes } = inspectList(resource);
    for (const group of ['table', 'batch', 'item']) {
      assert.deepEqual(actionScopes[group], {
        cluster: 'member-one',
        workspace: 'team-a',
        namespace: 'project-a',
      });
    }
  });

  test(`${resource} rows retain the route cluster for batch mutation requests`, () => {
    const { table } = inspectList(resource);
    const row = table.props.format({ metadata: { name: 'test-workload', namespace: 'project-a' } });
    assert.equal(row.cluster, 'member-one');
    assert.equal(row.namespace, 'project-a');
    assert.equal(row.name, 'test-workload');
  });

  test(`${resource} name cell shows failure reason and description fallback`, () => {
    const { table } = inspectList(resource);
    const nameColumn = table.props.columns.find((column: any) => column.field === 'name');
    const failed = { name: 'test-workload', statusReason: 'MinimumReplicasUnavailable' };
    const label = nameColumn.render(failed.name, failed).props.label;
    assert.equal(label.props.reason, 'MinimumReplicasUnavailable');
    assert.equal(label.props.status, 'warning');
    assert.equal(label.props.data, failed);
    assert.equal(
      nameColumn.render('healthy', { name: 'healthy', description: 'kept' }).props.label,
      'kept',
    );
    assert.equal(nameColumn.render('healthy', { name: 'healthy' }).props.label, '-');
  });
}
