import assert from 'node:assert';
import test from 'node:test';

import yaml from './yaml';

test('strict YAML loading returns a Kubernetes object for valid YAML', () => {
  assert.deepEqual(yaml.loadStrict('kind: Deployment\nmetadata:\n  name: demo'), {
    kind: 'Deployment',
    metadata: { name: 'demo' },
  });
});

test('strict YAML loading throws for malformed YAML', () => {
  assert.throws(
    () => yaml.loadStrict('kind: Deployment\nmetadata:\n  name: demo\nspec: ['),
    /YAMLException|unexpected end|bad indentation/i,
  );
});
