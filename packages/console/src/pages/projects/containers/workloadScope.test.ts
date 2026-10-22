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
    useUpdateDeploymentMutation: () => ({}),
    useDeleteDeploymentMutation: () => ({}),
    useBatchDeleteWorkloadMutation: () => ({}),
    useBatchStopDeploymentMutation: () => ({}),
  };
  const shared = {
    workloadStore: () => store,
    DataTable,
    Icon: Empty,
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
        return { ...React, useRef: () => ({}), useState: (value: unknown) => [value, () => {}] };
      }
      if (name === 'react-router-dom') return { useParams: () => params };
      if (name === '@ks-console/shared') return shared;
      if (name === '@kubed/components') return {};
      return Empty;
    },
  });
  const view = module.exports.default();
  const table = view.props.children.find((child: any) => child?.type === shared.DataTable);
  return { actionScopes, table };
}

for (const resource of ['Deployments', 'StatefulSets', 'DaemonSets']) {
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
}
