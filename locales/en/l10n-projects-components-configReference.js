/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  CONFIG_REFERENCE: 'Configuration References',
  CONFIG_REFERENCE_BACK: 'Back',
  CONFIG_REFERENCE_CONTAINER: 'Container',
  CONFIG_REFERENCE_RESOURCES: 'ConfigMap / Secret',
  CONFIG_REFERENCE_SECRET_NOTICE:
    'Only resource names, prefixes and key names are stored. Secret values are never displayed.',
  CONFIG_REFERENCE_ADD: 'Add reference',
  CONFIG_REFERENCE_LOADING: 'Loading resource list…',
  CONFIG_REFERENCE_LOAD_ERROR: 'Unable to load the ConfigMap/Secret list.',
  CONFIG_REFERENCE_RETRY: 'Retry',
  CONFIG_REFERENCE_EMPTY: 'No configuration references.',
  CONFIG_REFERENCE_PREFIX_PLACEHOLDER: 'Optional prefix',
  CONFIG_REFERENCE_DUPLICATE: 'Duplicate configuration reference. Please fix it first.',
  CONFIG_REFERENCE_NAME_REQUIRED: 'Choose a ConfigMap or Secret for each row.',
  CONFIG_REFERENCE_UNAVAILABLE: 'The referenced resource is unavailable. Choose another one.',
  CONFIG_REFERENCE_AUTO_RELOAD: 'Automatically roll workloads on configuration changes',
  CONFIG_REFERENCE_AUTO_RELOAD_DESC:
    'Stakater Reloader must be installed in the cluster. Turning this off only removes the Reloader annotation from this workload.',
  CONFIG_REFERENCE_ENABLED: 'Enabled',
  CONFIG_REFERENCE_DISABLED: 'Disabled',
  CONFIG_REFERENCE_CANCEL: 'Close',
  CONFIG_REFERENCE_SAVE: 'Apply',
  CONFIG_REFERENCE_SAVE_SUCCESS: 'Configuration references saved.',
  CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR: 'Unable to load the workload. Go back and retry.',
  CONFIG_REFERENCE_NO_CONTAINERS: 'No configurable containers in this {kind}.',
  CONFIG_REFERENCE_PREVIEW_OK: '✓ Will create {count} environment variable(s)',
  CONFIG_REFERENCE_PREVIEW_SHOW: 'Show',
  CONFIG_REFERENCE_PREVIEW_HIDE: 'Hide',
  CONFIG_REFERENCE_PREVIEW_SKIPPED: '{count} key(s) will be dropped',
  CONFIG_REFERENCE_PREVIEW_SKIPPED_TIP:
    'Not a valid environment variable name. Kubernetes drops it silently and emits no event.',
  CONFIG_REFERENCE_PREVIEW_BINARY: '{count} binaryData key(s) not read',
  CONFIG_REFERENCE_PREVIEW_CONFLICT: '{count} collide with environment variables',
  CONFIG_REFERENCE_PREVIEW_BAD_PREFIX:
    'The prefix is not a valid environment variable name (it must not start with a digit), so the cluster rejects the save.',
  CONFIG_REFERENCE_SAVE_FAILED: 'Failed to save configuration references.',
  CONFIG_REFERENCE_PREVIEW_DUPLICATED: '{count} duplicated by another reference',
  CONFIG_REFERENCE_ARIA_KIND: 'Reference type {index}',
  CONFIG_REFERENCE_ARIA_RESOURCE: 'Reference resource {index}',
  CONFIG_REFERENCE_ARIA_PREFIX: 'Prefix {index}',
  CONFIG_REFERENCE_ARIA_REMOVE: 'Remove reference {index}',
  CONFIG_REFERENCE_ARIA_CONTAINER: 'Container',
  CONFIG_REFERENCE_ARIA_CLOSE: 'Close',
  CONFIG_REFERENCE_EXPAND_ALL: 'Expand all',
  CONFIG_REFERENCE_COLLAPSE_ALL: 'Collapse all',
  CONFIG_REFERENCE_TOTAL: '{count} environment variables in total',
  CONFIG_REFERENCE_TOTAL_PARTIAL: '{count} references not read yet',
  CONFIG_REFERENCE_PREVIEW_EMPTY: 'No key will take effect',
  CONFIG_REFERENCE_PREVIEW_SECRET:
    'All keys of this Secret will be imported (key names are not previewed)',
};
