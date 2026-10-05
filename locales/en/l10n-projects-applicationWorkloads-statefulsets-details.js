/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  // More > Roll Back
  // More > Edit Service
  SELECTOR: 'Selector',
  // More > Edit Settings > Update Strategy
  // More > Edit Settings > Containers
  // More > Edit Settings > Volumes > Add Persistent Volume Template
  // More > Edit Settings > Volumes > Mount Volume
  // More > Edit Settings > Volumes > Mount Configmap or Secret
  // More > Edit Settings > Pod Scheduling Rules
  // More > Re-Create
  RECREATE: 'Re-create',
  RECREATE_SUCCESS_DESC: 'Re-created successfully.',
  CONFIG_REFERENCE: 'Configuration References',
  CONFIG_REFERENCE_BACK: 'Back',
  CONFIG_REFERENCE_CONTAINER: 'Container',
  CONFIG_REFERENCE_RESOURCES: 'ConfigMap / Secret',
  CONFIG_REFERENCE_SECRET_NOTICE: 'Only resource names and prefixes are stored.',
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
  CONFIG_REFERENCE_AUTO_RELOAD_DESC: 'Stakater Reloader must be installed in the cluster.',
  CONFIG_REFERENCE_ENABLED: 'Enabled',
  CONFIG_REFERENCE_DISABLED: 'Disabled',
  CONFIG_REFERENCE_CANCEL: 'Cancel',
  CONFIG_REFERENCE_SAVE: 'Save',
  CONFIG_REFERENCE_SAVE_SUCCESS: 'Configuration references saved.',
  CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR: 'Unable to load the workload. Go back and retry.',
  CONFIG_REFERENCE_NO_CONTAINERS: 'No configurable containers in this {kind}.',
  // Attributes
  // Resource Status
  // Revision Records
  // Metadata
  // Monitoring
  // Environment Variables
  // Events
};
