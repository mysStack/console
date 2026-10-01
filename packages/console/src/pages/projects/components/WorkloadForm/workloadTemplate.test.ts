import assert from 'node:assert/strict';
import test from 'node:test';

import { toWorkloadForm, toWorkloadManifest } from './workloadTemplate';

const form = {
  name: 'demo',
  image: 'nginx:1.27',
  env: [{ name: 'MODE', value: 'prod' }],
  envFrom: [{ type: 'secret' as const, name: 'db-credentials', prefix: '' }],
  serviceName: 'demo-headless',
};

test('writes env and envFrom into the shared pod template for standard workloads', () => {
  for (const kind of ['deployments', 'statefulsets', 'daemonsets'] as const) {
    const manifest = toWorkloadManifest(form, kind);
    const container = manifest.spec.template.spec.containers[0];

    assert.deepEqual(manifest.spec.selector.matchLabels, { app: 'demo' });
    assert.deepEqual(manifest.spec.template.metadata.labels, { app: 'demo' });
    assert.deepEqual(container.env, form.env);
    assert.deepEqual(container.envFrom, [{ secretRef: { name: 'db-credentials' } }]);
  }
});

test('preserves StatefulSet serviceName without leaking it to other workload kinds', () => {
  assert.equal(toWorkloadManifest(form, 'statefulsets').spec.serviceName, 'demo-headless');
  assert.equal(toWorkloadManifest(form, 'deployments').spec.serviceName, undefined);
  assert.equal(toWorkloadManifest(form, 'daemonsets').spec.serviceName, undefined);
  assert.equal(
    toWorkloadManifest({ ...form, serviceName: undefined }, 'statefulsets').spec.serviceName,
    'demo',
  );
});

test('preserves existing controller spec fields when editing', () => {
  const resource = {
    metadata: { name: 'demo', resourceVersion: '42' },
    spec: {
      replicas: 3,
      paused: true,
      strategy: { type: 'RollingUpdate' },
      selector: { matchLabels: { app: 'demo' } },
      template: {
        metadata: { labels: { app: 'demo', tier: 'web' } },
        spec: { containers: [{ name: 'demo', image: 'old', env: [], envFrom: [] }] },
      },
    },
  };
  const values = toWorkloadForm(resource, 'deployments');
  const manifest = toWorkloadManifest({ ...values, image: 'new' }, 'deployments');

  assert.equal(manifest.spec.replicas, 3);
  assert.equal(manifest.spec.paused, true);
  assert.deepEqual(manifest.spec.strategy, { type: 'RollingUpdate' });
  assert.deepEqual(manifest.spec.selector, { matchLabels: { app: 'demo' } });
  assert.deepEqual(manifest.spec.template.metadata.labels, { app: 'demo', tier: 'web' });
  assert.equal(manifest.spec.template.spec.containers[0].image, 'new');
});

test('reads pod template env and envFrom and keeps metadata.resourceVersion for edits', () => {
  const resource = {
    metadata: { name: 'demo', resourceVersion: '42' },
    spec: {
      serviceName: 'demo-headless',
      template: {
        spec: {
          containers: [
            {
              name: 'demo',
              image: 'nginx:1.27',
              env: [{ name: 'MODE', value: 'prod' }],
              envFrom: [{ secretRef: { name: 'db-credentials' } }],
            },
          ],
        },
      },
    },
  };

  assert.deepEqual(toWorkloadForm(resource, 'statefulsets'), {
    name: 'demo',
    image: 'nginx:1.27',
    env: [{ name: 'MODE', value: 'prod' }],
    envFrom: [{ type: 'secret', name: 'db-credentials', prefix: '' }],
    containerName: 'demo',
    serviceName: 'demo-headless',
    resourceVersion: '42',
    resource,
  });
});

test('reads and writes the first optional container port', () => {
  const resource = {
    metadata: { name: 'demo' },
    spec: {
      template: {
        spec: {
          containers: [{ name: 'demo', image: 'nginx', ports: [{ containerPort: 8080 }] }],
        },
      },
    },
  };
  const values = toWorkloadForm(resource, 'deployments');
  assert.equal(values.containerPort, 8080);
  assert.deepEqual(
    toWorkloadManifest({ ...values, containerPort: 9090 }, 'deployments').spec.template.spec
      .containers[0].ports,
    [{ containerPort: 9090 }],
  );
});

test('updates only the first port while preserving other existing ports', () => {
  const resource = {
    metadata: { name: 'demo' },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'runtime',
              image: 'nginx',
              ports: [
                { name: 'http', containerPort: 8080 },
                { name: 'metrics', containerPort: 9090 },
              ],
            },
          ],
        },
      },
    },
  };
  const values = toWorkloadForm(resource, 'deployments');
  const ports = toWorkloadManifest({ ...values, containerPort: 8081 }, 'deployments').spec.template
    .spec.containers[0].ports;
  assert.deepEqual(ports, [
    { name: 'http', containerPort: 8081 },
    { name: 'metrics', containerPort: 9090 },
  ]);
});

test('clearing the port explicitly removes all existing ports', () => {
  const resource = {
    metadata: { name: 'demo' },
    spec: {
      template: {
        spec: {
          containers: [{ name: 'runtime', image: 'nginx', ports: [{ containerPort: 8080 }] }],
        },
      },
    },
  };
  const values = toWorkloadForm(resource, 'deployments');
  const ports = toWorkloadManifest(
    { ...values, containerPort: undefined, clearContainerPort: true },
    'deployments',
  ).spec.template.spec.containers[0].ports;
  assert.deepEqual(ports, []);
});

test('normalizes edited EnvVar values so value and valueFrom are mutually exclusive', () => {
  const resource = {
    metadata: { name: 'demo' },
    spec: {
      template: {
        spec: {
          containers: [
            {
              name: 'runtime',
              image: 'nginx',
              env: [{ name: 'POD_NAME', valueFrom: { fieldRef: { fieldPath: 'metadata.name' } } }],
            },
          ],
        },
      },
    },
  };
  const values = toWorkloadForm(resource, 'deployments');
  const manifest = toWorkloadManifest(
    {
      ...values,
      env: [{ name: 'POD_NAME', value: 'demo' }],
    },
    'deployments',
  );
  assert.deepEqual(manifest.spec.template.spec.containers[0].env, [
    { name: 'POD_NAME', value: 'demo' },
  ]);
});

test('preserves an existing container name when the workload name differs', () => {
  const resource = {
    metadata: { name: 'demo' },
    spec: {
      template: { spec: { containers: [{ name: 'runtime', image: 'nginx' }] } },
    },
  };
  const values = toWorkloadForm(resource, 'deployments');
  assert.equal(
    toWorkloadManifest(values, 'deployments').spec.template.spec.containers[0].name,
    'runtime',
  );
});
