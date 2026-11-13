import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const requireFromSource = createRequire(join(__dirname, 'ConfigReferencePanel.tsx'));

function renderPanel(canEdit: boolean, moduleName = 'deployments') {
  const permissions: unknown[] = [];
  const writes: unknown[] = [];
  // Seed the loaded panel, including one existing reference, to exercise its controls.
  const states = [
    [{ label: 'fixture-config', value: 'fixture-config' }],
    [],
    false,
    false,
    0,
    'main',
    [{ kind: 'configMap', name: 'fixture-config', prefix: 'APP_' }],
    false,
    null,
  ];
  let stateIndex = 0;
  const react = {
    createElement: (type: unknown, props: any, ...children: any[]) => ({
      type,
      props: props || {},
      children: children.flat(Infinity).filter(item => item != null && item !== false),
    }),
    useState: () => [states[stateIndex++], () => {}],
    useEffect: () => {},
    useMemo: (fn: () => unknown) => fn(),
  };
  const store = {
    useGetDetail: () => ({
      data: {
        _originData: {
          metadata: { name: 'fixture' },
          spec: {
            template: {
              spec: {
                containers: [
                  {
                    name: 'main',
                    envFrom: [{ configMapRef: { name: 'fixture-config' }, prefix: 'APP_' }],
                  },
                ],
              },
            },
          },
        },
        name: 'fixture',
      },
      isLoading: false,
      isError: false,
      refetch: () => {},
    }),
    getDetailUrl: () => '/fixture',
  };
  const ts = requireFromSource('typescript');
  const code = ts.transpileModule(
    readFileSync(join(__dirname, 'ConfigReferencePanel.tsx'), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2019,
        jsx: ts.JsxEmit.React,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} as any };
  vm.runInNewContext(code, {
    module: loaded,
    exports: loaded.exports,
    t: (key: string) => key,
    require: (id: string) => {
      if (id === 'react') return react;
      if (id === 'react-query')
        return { useMutation: (fn: any) => ({ mutate: fn, isLoading: false }) };
      if (id === '@kubed/components')
        return {
          Button: 'Button',
          Card: 'Card',
          Input: 'Input',
          Loading: 'Loading',
          Select: 'Select',
          Switch: 'Switch',
          notify: { success() {}, error() {} },
        };
      if (id === '@ks-console/shared')
        return {
          configMapStore: {},
          secretStore: {},
          workloadStore: () => store,
          hasPermission: (params: unknown) => {
            permissions.push(params);
            return canEdit;
          },
          request: {
            patch: (...args: unknown[]) => {
              writes.push(args);
              return Promise.resolve({});
            },
          },
        };
      if (id === './useReferencePreviews') return { useReferencePreviews: () => [] };
      if (id === './ConfigReferencePreview') return { __esModule: true, default: 'Preview' };
      return requireFromSource(id);
    },
  });
  const tree = loaded.exports.default({
    cluster: 'cluster-a',
    namespace: 'project-a',
    name: 'fixture',
    module: moduleName,
    workloadKind: 'Deployment',
    onBack: () => {},
  });
  const nodes: any[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    nodes.push(node);
    node.children?.forEach(visit);
  };
  visit(tree);
  const button = (label: string) =>
    nodes.find(node => node.type === 'Button' && node.children.includes(label));
  return { nodes, button, permissions, writes };
}

test('a project viewer can inspect references and select containers with editing disabled', () => {
  const f = renderPanel(false);
  assert.equal(f.button('CONFIG_REFERENCE_SAVE').props.disabled, true);
  assert.equal(f.button('CONFIG_REFERENCE_ADD').props.disabled, true);
  assert.equal(f.button('删除').props.disabled, true);
  assert.equal(f.nodes.find(node => node.type === 'Input').props.readOnly, true);
  assert.equal(f.nodes.find(node => node.type === 'Switch').props.disabled, true);
  const selects = f.nodes.filter(node => node.type === 'Select');
  assert.notEqual(selects[0].props.disabled, true);
  assert.ok(selects.slice(1).every(node => node.props.disabled));
  f.button('CONFIG_REFERENCE_SAVE').props.onClick();
  assert.equal(f.writes.length, 0);
});

test('an editor retains reference editing and submission', () => {
  const f = renderPanel(true);
  assert.equal(f.button('CONFIG_REFERENCE_SAVE').props.disabled, false);
  assert.equal(f.button('CONFIG_REFERENCE_ADD').props.disabled, false);
  assert.equal(f.nodes.find(node => node.type === 'Input').props.readOnly, false);
  f.button('CONFIG_REFERENCE_SAVE').props.onClick();
  assert.equal(f.writes.length, 1);
});

test('all workload types check edit permission in the selected project and cluster', () => {
  for (const moduleName of ['deployments', 'statefulsets', 'daemonsets']) {
    const f = renderPanel(false, moduleName);
    assert.equal(f.permissions.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(f.permissions[0])), {
      cluster: 'cluster-a',
      project: 'project-a',
      module: 'workloads',
      action: 'edit',
    });
  }
});
