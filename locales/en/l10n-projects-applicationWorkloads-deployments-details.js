/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  // More > Roll Back
  ROLL_BACK: 'Roll Back',
  CURRENT_REVISION_RECORD: 'Current Revision Record',
  TARGET_REVISION_EMPTY_DESC: 'Please select a target revision record.',
  TARGET_REVISION_RECORD: 'Target Revision Record',
  // More > Edit Autoscaling
  CONFIGURE_AUTOSCALING_DESC:
    'Set the system to automatically adjust the number of pod replicas based on target CPU usage and target memory usage.',
  EDIT_AUTOSCALING: 'Edit Autoscaling',
  TARGET_CPU_USAGE_UNIT: 'Target CPU Usage (%)',
  AUTOSCALING: 'Autoscaling',
  RESOURCE_NAME: 'Resource Name',
  TARGET_CPU_USAGE_DESC:
    'The system automatically decreases/increases the number of pod replicas when the actual CPU usage is higher/lower than the target.',
  TARGET_MEMORY_USAGE_DESC:
    'The system automatically decreases/increases the number of pod replicas when the actual memory usage is higher/lower than the target.',
  MINIMUM_REPLICAS_DESC: 'Set the minimum number of pod replicas allowed. The default value is 1.',
  MAXIMUM_REPLICAS_DESC: 'Set the maximum number of pod replicas allowed. The default value is 1.',
  TARGET_MEMORY_USAGE_UNIT: 'Target Memory Usage (MiB)',
  MINIMUM_REPLICAS: 'Minimum Replicas',
  MAXIMUM_REPLICAS: 'Maximum Replicas',
  // More > Edit Settings > Update Strategy
  EDIT_SETTINGS: 'Edit Settings',
  // More > Edit Settings > Containers
  FROM_CONFIGMAP: 'From configmap',
  FROM_SECRET: 'From secret',
  BATCH_REFERENCE: 'Batch Reference',
  BATCH_REFERENCE_DESC: 'Reference multiple keys in a configmap or secret.',
  DESELECT_ALL: 'Deselect all',
  KEY_PL: 'Keys',
  // More > Edit Settings > Volumes
  // More > Edit Settings > Volumes > Mount Volume
  // More > Edit Settings > Volumes > Mount Configmap or Secret
  // More > Edit Settings > Pod Scheduling Rules
  RULE_NOT_COMPLETE: 'Please set a complete rule.',
  // Attributes

  // Revision Records
  REVISION_RECORDS: 'Revision Records',
  CONFIG_FILE: 'Configuration File',
  COMPARE_WITH: 'Compared with the previous record {version}',
  // Resource Status
  REPLICAS_DESIRED: 'Desired',
  REPLICAS_CURRENT: 'Current',
  ADJUST_REPLICAS: 'Adjust Replicas',
  REPLICAS_SCALE_NOTIFY_CONTENT:
    'Are you sure you want to change the number of pod replicas to {num}?',
  REPLICAS_SCALE_NOTIFY_CONFIRM: 'OK ({seconds}s)',
  REPLICAS_SCALE_NOTIFY_CANCEL: 'Cancel',
  // Resource Status > Autoscaling
  TARGET_MEMORY_USAGE: 'Target Memory Usage',
  TARGET_CPU_USAGE: 'Target CPU Usage',
  TARGET_CURRENT: '{target} (Current: {current})',
  NOT_ENABLE: '{resource} Not Enabled',
  // Resource Status > Image Builder
  CONTAINER_LOG_NOT_ENABLED: 'Container Log is not enabled.',
  BUILD_LOG: 'Build Log',
  TASK: 'Task',
  IN_PROGRESS: 'in progress',
  IMAGE_BUILDING: 'Image Building',
  HAS_FAILED: 'has failed',
  // Metadata
  // Monitoring
  // Monitoring > View All Replicas (visible only when replicas > 5)
  VIEW_ALL_REPLICAS: 'View All Replicas',
  SHOW_SELECTED_ONLY: 'Show Selected Only',
  MONITORING_SELECT_LIMIT_MSG: 'A maximum of 10 resources can be selected.',
  MONITORING_ALERT_DESC:
    'Information about a maximum of five pod replicas are displayed by default. You can click <b>View All Replicas</b> to view information about all pod replicas.',
  CURRENT_VALUE: 'Current: {value}',
  // Environment Variables
  ENVIRONMENT_VARIABLE_PL: 'Environment Variables',
  // Events
  EVENT_AGE: 'Occurred',
  EVENT_AGE_DATA: '{lastTime}<br/>({count} times over {duration})',
  EVENT_AGE_DATA_TWICE: '{lastTime}<br/>(twice over {duration})',
  SOURCE: 'Source',
  CONFIG_REFERENCE: 'Configuration References',
  CONFIG_REFERENCE_BACK: 'Back',
  CONFIG_REFERENCE_CONTAINER: 'Container',
  CONFIG_REFERENCE_RESOURCES: 'ConfigMap / Secret',
  CONFIG_REFERENCE_SECRET_NOTICE:
    'Only resource names and prefixes are stored. Secret values are never read or displayed.',
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
  CONFIG_REFERENCE_CANCEL: 'Cancel',
  CONFIG_REFERENCE_SAVE: 'Save',
  CONFIG_REFERENCE_SAVE_SUCCESS: 'Configuration references saved.',
  CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR: 'Unable to load the workload. Go back and retry.',
  CONFIG_REFERENCE_NO_CONTAINERS: 'No configurable containers in this {kind}.',
};
