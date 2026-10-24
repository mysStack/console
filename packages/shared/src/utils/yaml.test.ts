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

test('strict YAML loading parses String objects instead of forwarding them', () => {
  const malformed = new String('kind: Deployment\nmetadata:\n  name: demo\nspec: [');

  assert.throws(() => yaml.loadStrict(malformed), /YAMLException|unexpected end|bad indentation/i);
});

test('strict YAML loading rejects scalar documents', () => {
  assert.throws(() => yaml.loadStrict('just-a-string'), /YAML document must evaluate to an object/);
});
