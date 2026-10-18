/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import yaml from './yaml';
import {
  SECRET_YAML_REDACTED_VALUE,
  getSecretYamlEditorValue,
  mergeSecretYaml,
} from './secretYaml';

const originalSecret = {
  apiVersion: 'v1',
  kind: 'Secret',
  metadata: {
    name: 'example',
    namespace: 'v4-migration-e2e',
    annotations: {
      'kubectl.kubernetes.io/last-applied-configuration': '{"data":{"token":"ZmFrZQ=="}}',
      'kubesphere.io/description': 'safe metadata',
    },
  },
  type: 'Opaque',
  data: {
    token: 'ZmFrZQ==',
    removeMe: 'cmVtb3Zl',
  },
};

test('Secret YAML editor value redacts data and last-applied configuration', () => {
  const value = getSecretYamlEditorValue(originalSecret);

  assert.equal(value.includes(originalSecret.data.token), false);
  assert.equal(value.includes(originalSecret.data.removeMe), false);
  assert.equal(value.includes('last-applied-configuration'), false);
  assert.equal(value.includes(SECRET_YAML_REDACTED_VALUE), true);
  assert.equal(value.includes('safe metadata'), true);
});

test('Secret YAML merge preserves redacted values and supports explicit updates', () => {
  const editorValue = getSecretYamlEditorValue(originalSecret);
  const edited = yaml.load(editorValue);
  edited.data.token = 'bmV3';
  edited.data.added = 'YWRkZWQ=';
  delete edited.data.removeMe;

  const merged = mergeSecretYaml(originalSecret, edited);

  assert.deepEqual(merged.data, {
    token: 'bmV3',
    added: 'YWRkZWQ=',
  });
  assert.equal(
    merged.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'],
    undefined,
  );
  assert.equal(merged.metadata.annotations['kubesphere.io/description'], 'safe metadata');
});

test('Secret YAML merge keeps an existing value when its redaction marker is unchanged', () => {
  const edited = yaml.load(getSecretYamlEditorValue(originalSecret));
  const merged = mergeSecretYaml(originalSecret, edited);

  assert.equal(merged.data.token, originalSecret.data.token);
  assert.equal(merged.data.removeMe, originalSecret.data.removeMe);
});
