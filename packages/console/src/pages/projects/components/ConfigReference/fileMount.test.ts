import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFileMountPatch,
  getContainerVolumeMounts,
  getWorkloadVolumes,
  isVolumeName,
  planFileMounts,
  toVolumeName,
  validateFileMounts,
  volumeReferences,
} from './fileMount';
import type { FileMountReference } from './fileMount';

const mount = (
  name: string,
  mountPath: string,
  overrides: Partial<FileMountReference> = {},
): FileMountReference => ({
  kind: 'configMap',
  name,
  mountPath,
  readOnly: true,
  ...overrides,
});

const workload = (volumes: unknown, containers: unknown) =>
  ({ spec: { template: { spec: { volumes, containers } } } }) as any;

test('derives a DNS-1123 label from a resource name', () => {
  assert.equal(toVolumeName('ewms-rabbitmq-config'), 'ewms-rabbitmq-config');
  assert.equal(toVolumeName('app.config'), 'app-config', 'dots are not valid in a label');
  assert.equal(toVolumeName('App_Config'), 'app-config');
  // Kubernetes validates volume names with IsDNS1123Label, whose pattern is
  // [a-z0-9]([-a-z0-9]*[a-z0-9])? — a leading digit is allowed. (A leading dash is
  // not, so that still has to be stripped.)
  assert.equal(toVolumeName('9lives'), '9lives');
  assert.equal(toVolumeName('-app'), 'app');
  assert.equal(toVolumeName('---'), 'config', 'never empty');
  assert.equal(toVolumeName(''), 'config');
  assert.equal(toVolumeName('a'.repeat(80)).length, 63);
});

test('avoids a volume name that is already taken', () => {
  assert.equal(toVolumeName('app-config', ['app-config']), 'app-config-2');
  assert.equal(toVolumeName('app-config', ['app-config', 'app-config-2']), 'app-config-3');
  const long = 'a'.repeat(63);
  const next = toVolumeName(long, [long]);
  assert.equal(next.length, 63);
  assert.ok(next.endsWith('-2'));
  assert.ok(isVolumeName(next));
});

test('reports whether a volume already points at a resource', () => {
  assert.equal(volumeReferences({ configMap: { name: 'cm' } }, 'configMap', 'cm'), true);
  assert.equal(volumeReferences({ configMap: { name: 'other' } }, 'configMap', 'cm'), false);
  assert.equal(volumeReferences({ secret: { name: 's' } }, 'configMap', 's'), false);
  assert.equal(volumeReferences({ secret: { name: 's' } }, 'secret', 's'), true);
  assert.equal(volumeReferences({ emptyDir: {} }, 'configMap', 'cm'), false);
});

test('creates a Pod-level volume and a container-level mount', () => {
  const plan = planFileMounts({
    volumes: [],
    containerMounts: [],
    otherContainerMounts: [],
    references: [mount('app-config', '/etc/app')],
  });

  assert.deepEqual(plan.volumes, [{ name: 'app-config', configMap: { name: 'app-config' } }]);
  assert.deepEqual(plan.volumeMounts, [
    { name: 'app-config', mountPath: '/etc/app', readOnly: true },
  ]);
});

test('reuses an existing volume that already points at the resource', () => {
  const plan = planFileMounts({
    volumes: [{ name: 'existing', secret: { name: 'app-secret' } }],
    containerMounts: [],
    otherContainerMounts: [],
    references: [mount('app-secret', '/etc/secret', { kind: 'secret' })],
  });

  assert.equal(plan.volumes.length, 1, 'no duplicate volume');
  assert.equal(plan.volumes[0].name, 'existing');
  assert.deepEqual(plan.volumeMounts, [
    { name: 'existing', mountPath: '/etc/secret', readOnly: true },
  ]);
});

test('reuses a volume another container already mounts', () => {
  const plan = planFileMounts({
    volumes: [{ name: 'app-config', configMap: { name: 'app-config' } }],
    containerMounts: [],
    otherContainerMounts: [{ name: 'app-config', mountPath: '/etc/app' }],
    references: [mount('app-config', '/srv/app')],
  });

  assert.equal(plan.volumes.length, 1);
  assert.deepEqual(plan.volumeMounts, [
    { name: 'app-config', mountPath: '/srv/app', readOnly: true },
  ]);
});

test('drops the volume when this container stops mounting it and nothing else does', () => {
  const plan = planFileMounts({
    volumes: [{ name: 'app-config', configMap: { name: 'app-config' } }],
    containerMounts: [{ name: 'app-config', mountPath: '/etc/app' }],
    otherContainerMounts: [],
    references: [],
  });

  assert.deepEqual(plan.volumes, []);
  assert.deepEqual(plan.volumeMounts, []);
});

test('keeps the volume while another container still mounts it', () => {
  const plan = planFileMounts({
    volumes: [{ name: 'app-config', configMap: { name: 'app-config' } }],
    containerMounts: [{ name: 'app-config', mountPath: '/etc/app' }],
    otherContainerMounts: [{ name: 'app-config', mountPath: '/etc/app' }],
    references: [],
  });

  assert.deepEqual(plan.volumes, [{ name: 'app-config', configMap: { name: 'app-config' } }]);
  assert.deepEqual(plan.volumeMounts, []);
});

test('leaves volumes this container never referenced alone', () => {
  const unrelated = { name: 'data', persistentVolumeClaim: { claimName: 'pvc' } };
  const orphan = { name: 'stale', configMap: { name: 'stale' } };
  const plan = planFileMounts({
    volumes: [unrelated, orphan],
    containerMounts: [],
    otherContainerMounts: [],
    references: [mount('app-config', '/etc/app')],
  });

  assert.deepEqual(
    plan.volumes.map(volume => volume.name),
    ['data', 'stale', 'app-config'],
    'pre-existing orphans are not our business to clean up',
  );
});

test('omits readOnly when the mount is writable', () => {
  const plan = planFileMounts({
    volumes: [],
    containerMounts: [],
    otherContainerMounts: [],
    references: [mount('app-config', '/etc/app', { readOnly: false })],
  });

  assert.deepEqual(plan.volumeMounts, [{ name: 'app-config', mountPath: '/etc/app' }]);
});

test('validates paths and resources', () => {
  assert.deepEqual(validateFileMounts([mount('a', '/etc/a')]), []);
  assert.deepEqual(validateFileMounts([mount('a', 'etc/a')]), [
    { index: 0, code: 'PATH_ABSOLUTE' },
  ]);
  assert.deepEqual(validateFileMounts([mount('a', '/etc/a'), mount('b', '/etc/a')]), [
    { index: 1, code: 'PATH_DUPLICATE' },
  ]);
  assert.deepEqual(validateFileMounts([mount('a', '/etc/a'), mount('a', '/etc/b')]), [
    { index: 1, code: 'RESOURCE_DUPLICATE' },
  ]);
  assert.deepEqual(validateFileMounts([mount('', '/etc/a')]), [
    { index: 0, code: 'NAME_REQUIRED' },
  ]);
  // the same resource in a different kind is not a duplicate
  assert.deepEqual(
    validateFileMounts([mount('a', '/etc/a'), mount('a', '/etc/b', { kind: 'secret' })]),
    [],
  );
});

test('reads volumes and mounts without touching the mapped wrapper', () => {
  const source = {
    _originData: {
      spec: {
        template: {
          spec: {
            volumes: [{ name: 'v' }],
            containers: [{ name: 'main', volumeMounts: [{ name: 'v', mountPath: '/v' }] }],
          },
        },
      },
    },
    spec: { template: { spec: { volumes: [], containers: [] } } },
  } as any;

  assert.deepEqual(getWorkloadVolumes(source), [{ name: 'v' }]);
  assert.deepEqual(getContainerVolumeMounts(source, 'main'), [{ name: 'v', mountPath: '/v' }]);
  assert.deepEqual(getContainerVolumeMounts(source, 'missing'), []);
});

test('emits both layer operations, and only when they change', () => {
  const source = workload([], [{ name: 'main', envFrom: [{ configMapRef: { name: 'other' } }] }]);

  const ops = buildFileMountPatch(source, 0, 'main', [mount('app-config', '/etc/app')]);
  assert.deepEqual(
    ops.map(op => `${op.op} ${op.path}`),
    ['add /spec/template/spec/volumes', 'add /spec/template/spec/containers/0/volumeMounts'],
  );

  // nothing to do: the mounts already match the plan
  const settled = workload(
    [{ name: 'app-config', configMap: { name: 'app-config' } }],
    [
      {
        name: 'main',
        volumeMounts: [{ name: 'app-config', mountPath: '/etc/app', readOnly: true }],
      },
    ],
  );
  assert.deepEqual(
    buildFileMountPatch(settled, 0, 'main', [mount('app-config', '/etc/app')]),
    [],
    'an unchanged plan must not rewrite the volumes',
  );
});

test('ignores the defaults Kubernetes adds to a volume', () => {
  // The API puts `defaultMode: 420` on a configMap volume; that must not look like a
  // change, and a replace would drop it.
  const source = workload(
    [{ name: 'app-config', configMap: { name: 'app-config', defaultMode: 420 } }],
    [
      {
        name: 'main',
        volumeMounts: [{ name: 'app-config', mountPath: '/etc/app', readOnly: true }],
      },
    ],
  );

  assert.deepEqual(buildFileMountPatch(source, 0, 'main', [mount('app-config', '/etc/app')]), []);
});

test('removes both layers when the last mount goes away', () => {
  const source = workload(
    [{ name: 'app-config', configMap: { name: 'app-config' } }],
    [
      {
        name: 'main',
        volumeMounts: [{ name: 'app-config', mountPath: '/etc/app', readOnly: true }],
      },
    ],
  );

  assert.deepEqual(buildFileMountPatch(source, 0, 'main', []), [
    { op: 'remove', path: '/spec/template/spec/volumes' },
    { op: 'remove', path: '/spec/template/spec/containers/0/volumeMounts' },
  ]);
});

test("keeps another container's mounts out of the patch", () => {
  const source = workload(
    [{ name: 'shared', configMap: { name: 'shared' } }],
    [
      { name: 'main', volumeMounts: [{ name: 'shared', mountPath: '/etc/shared' }] },
      { name: 'sidecar', volumeMounts: [{ name: 'shared', mountPath: '/etc/shared' }] },
    ],
  );

  // main drops it, sidecar keeps it: the volume must stay and only main's mounts change
  assert.deepEqual(buildFileMountPatch(source, 0, 'main', []), [
    { op: 'remove', path: '/spec/template/spec/containers/0/volumeMounts' },
  ]);
});
