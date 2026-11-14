import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const requireFromSource = createRequire(join(__dirname, 'ConfigReferencePanel.tsx'));

function renderPanel(
  canEdit: boolean,
  moduleName = 'deployments',
  resourceVersion: string | undefined = '42',
  formatted = false,
) {
  const permissions: unknown[] = [];
  const writes: unknown[] = [];
  const events: unknown[] = [];
  let mutationOptions: any;
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
          metadata: { name: 'fixture', ...(formatted ? {} : { resourceVersion }) },
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
        ...(formatted ? { resourceVersion, uid: 'fixture-uid' } : {}),
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
        return {
          useMutation: (fn: any, options: any) => {
            mutationOptions = options;
            return { mutate: fn, isLoading: false };
          },
        };
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
    onWriteStart: (value: unknown) => {
      events.push({ type: 'start', value });
    },
    onWriteResult: (value: unknown) => {
      events.push({ type: 'result', value });
    },
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
  return { nodes, button, permissions, writes, events, mutationOptions };
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
    const editor = renderPanel(true, moduleName);
    assert.equal(editor.button('CONFIG_REFERENCE_SAVE').props.disabled, false);
    assert.equal(f.permissions.length, 1);
    assert.deepEqual(JSON.parse(JSON.stringify(f.permissions[0])), {
      cluster: 'cluster-a',
      project: 'project-a',
      module: moduleName,
      action: 'edit',
    });
  }
});

test('a missing loaded resourceVersion disables save and prevents an unguarded patch', () => {
  const f = renderPanel(true, 'deployments', '');
  assert.equal(f.button('CONFIG_REFERENCE_SAVE').props.disabled, true);
  f.button('CONFIG_REFERENCE_SAVE').props.onClick();
  assert.equal(f.writes.length, 0);
});

test('saving tests the original resourceVersion before changing the container array', () => {
  const f = renderPanel(true, 'deployments', '42');
  f.button('CONFIG_REFERENCE_SAVE').props.onClick();
  const patch = (f.writes[0] as any[])[1];
  assert.deepEqual(JSON.parse(JSON.stringify(patch[0])), {
    op: 'test',
    path: '/metadata/resourceVersion',
    value: '42',
  });
  assert.equal(patch[1].path, '/spec/template/spec/containers/0/envFrom');
});

test('the panel reports the guarded submission and its saved resource to its host', async () => {
  const f = renderPanel(true);
  f.button('CONFIG_REFERENCE_SAVE').props.onClick();
  assert.equal(f.events.length, 1);
  const start = f.events[0] as any;
  assert.equal(start.type, 'start');
  assert.equal(start.value.patch[0].path, '/metadata/resourceVersion');
  assert.equal(start.value.resource.metadata.resourceVersion, '42');
  const saved = { metadata: { uid: 'fixture-uid', resourceVersion: '43' } };
  await f.mutationOptions.onSuccess(saved);
  assert.deepEqual(JSON.parse(JSON.stringify(f.events[1])), {
    type: 'result',
    value: { outcome: 'saved', status: 200, resource: saved },
  });
});

test('network errors report an uncertain result while rejected saves retain the draft', () => {
  const f = renderPanel(true);
  f.mutationOptions.onError({ code: 'ECONNRESET' });
  assert.deepEqual(JSON.parse(JSON.stringify(f.events[0])), {
    type: 'result',
    value: { outcome: 'unknown' },
  });
  f.mutationOptions.onError({
    response: { status: 422, data: { message: 'resourceVersion test failed' } },
  });
  assert.deepEqual(JSON.parse(JSON.stringify(f.events[1])), {
    type: 'result',
    value: { outcome: 'rejected', status: 422 },
  });
});

test('mapped workload metadata from the same query protects saves after raw metadata was omitted', () => {
  const f = renderPanel(true, 'deployments', '42', true);
  assert.equal(f.button('CONFIG_REFERENCE_SAVE').props.disabled, false);
  f.button('CONFIG_REFERENCE_SAVE').props.onClick();
  assert.equal((f.writes[0] as any[])[1][0].value, '42');
  const submission = (f.events[0] as any).value;
  assert.equal(submission.resource.metadata.uid, 'fixture-uid');
  assert.equal(submission.resource.metadata.resourceVersion, '42');
});
