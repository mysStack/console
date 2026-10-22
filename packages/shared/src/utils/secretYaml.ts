/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import yaml from './yaml';

export const SECRET_YAML_REDACTED_VALUE = '__KUBESPHERE_SECRET_VALUE_REDACTED__';

type SecretResource = Record<string, any>;

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * Creates the value shown in the Secret YAML editor without exposing existing
 * data values or the last-applied annotation, which can contain the same data.
 */
export const getSecretYamlEditorValue = (secret: SecretResource): string => {
  const preview = clone(secret);

  if (preview.metadata?.annotations) {
    delete preview.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
  }

  if (preview.data) {
    preview.data = Object.keys(preview.data).reduce(
      (data, key) => ({ ...data, [key]: SECRET_YAML_REDACTED_VALUE }),
      {},
    );
  }

  return yaml.getValue(preview);
};

/**
 * Merges YAML edited from the redacted Secret representation back into the
 * original resource. An unchanged marker preserves the existing value; a
 * replaced marker is treated as an explicit base64 value. Omitting a key
 * removes it, so normal Secret YAML CRUD semantics remain available.
 */
export const mergeSecretYaml = (
  original: SecretResource,
  edited: SecretResource,
): SecretResource => {
  const merged = clone(edited);
  const originalData = original.data || {};

  if (merged.metadata?.annotations) {
    delete merged.metadata.annotations['kubectl.kubernetes.io/last-applied-configuration'];
  }

  if (Object.prototype.hasOwnProperty.call(merged, 'data')) {
    merged.data = Object.keys(merged.data || {}).reduce((data, key) => {
      const value = merged.data[key];
      return {
        ...data,
        [key]:
          value === SECRET_YAML_REDACTED_VALUE &&
          Object.prototype.hasOwnProperty.call(originalData, key)
            ? originalData[key]
            : value,
      };
    }, {});
  } else if (Object.prototype.hasOwnProperty.call(original, 'data')) {
    merged.data = clone(originalData);
  }

  return merged;
};
