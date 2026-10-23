/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  WORKLOAD_SETTINGS_INVALID:
    'Invalid update strategy, count or duration. Use non-negative integers or valid percentages; max unavailable and max surge must not both be zero.',
  WORKLOAD_TERMINATION_GRACE_PERIOD: 'Pod Graceful Termination',
  WORKLOAD_TERMINATION_GRACE_SECONDS: 'Termination grace period (seconds)',

  WORKLOAD_SETTINGS_CONFLICT:
    'The resource was updated by another operation. Cancel and reopen Edit Settings before saving.',
  WORKLOAD_SETTINGS_SAVE_FAILED:
    'Settings were not saved. Check your network and permissions, then try again.',
  WORKLOAD_SETTINGS_LOAD_FAILED:
    'Unable to load the latest workload settings. Refresh and try again.',
  VOLUME_MOUNT_PL: 'Volume Mounts',
  WORKLOAD_PRESERVED_VOLUME: 'Existing {type} volume is preserved while editing other settings.',
  WORKLOAD_ADD_CONTAINER: 'Add Container',
  WORKLOAD_ADD_INIT_CONTAINER: 'Add Init Container',
  WORKLOAD_ADD_ENV: 'Add Environment Variable',
  WORKLOAD_CONTAINER_INVALID: 'Enter a valid container name and image.',
  WORKLOAD_CONTAINER_DUPLICATE: 'Container and init container names must be unique.',
  WORKLOAD_ENV_DUPLICATE: 'Environment variable names must be unique within a container.',
  WORKLOAD_PORT_INVALID:
    'Enter a valid port (1–65535), protocol and optional port name (up to 15 characters).',
  WORKLOAD_PORT_DUPLICATE: 'Port names must be unique across the Pod.',
  WORKLOAD_PROBE_INVALID: 'Enter a valid probe type, path, port, and timing values.',
  WORKLOAD_LIFECYCLE_INVALID:
    'Enter a valid lifecycle action, path, port, or command. Regular init containers do not support lifecycle actions.',
  WORKLOAD_SECURITY_CONTEXT_INVALID:
    'Enter valid security context booleans, integer user or group IDs, SELinux values, and capability names.',
  WORKLOAD_ANNOTATIONS_INVALID: 'Enter valid Kubernetes annotation names and text values.',
  WORKLOAD_SCHEDULING_INVALID: 'Complete every Pod scheduling rule and select a valid target.',
  WORKLOAD_SCHEDULING_PRESERVED: 'Keep existing advanced scheduling',
  WORKLOAD_NODE_SELECTOR_INVALID: 'Enter valid Kubernetes node selector keys and values.',
  WORKLOAD_TARGET_OPTIONS_FAILED:
    'Unable to load workload targets. Check the namespace and try again.',
  CONTAINER_SECURITY_CONTEXT: 'Container Security Context',
  POD_SECURITY_CONTEXT: 'Pod Security Context',
  PRIVILEGED_MODE: 'Privileged Mode',
  ALLOW_PRIVILEGE_ESCALATION: 'Allow Privilege Escalation',
  ROOT_DIRECTORY_READONLY: 'Root Directory Read-Only',
  USER_GROUP: 'User Group',
  RUN_AS_NON_ROOT: 'Run as Non-root',
  SELINUX_CONTEXT: 'SELinux Context',
  CAPABILITIES: 'Capabilities',
  WORKLOAD_RESOURCE_INVALID: 'Enter valid CPU and memory quantities.',
  WORKLOAD_CONFIG_REFERENCE_INVALID: 'Select a valid ConfigMap or Secret.',
  WORKLOAD_VOLUME_INVALID: 'Enter a valid volume name, source, and path.',
  WORKLOAD_VOLUME_DUPLICATE: 'Volume names must be unique.',
  WORKLOAD_VOLUME_MOUNT_INVALID:
    'Select an existing volume and enter a unique absolute mount path.',
  WORKLOAD_ADD_CONFIG_REFERENCE: 'Add Config Reference',
  WORKLOAD_REFERENCE_TYPE: 'Resource Type',
  WORKLOAD_REFERENCE_RESOURCE: 'Configuration Resource',
  WORKLOAD_SELECT_RESOURCE: 'Select a resource',
  WORKLOAD_HEALTH_CHECKS: 'Health Checks',
  WORKLOAD_INITIAL_DELAY: 'Initial Delay (s)',
  WORKLOAD_TIMEOUT: 'Timeout (s)',
  WORKLOAD_PERIOD: 'Period (s)',
  WORKLOAD_SUCCESS_THRESHOLD: 'Success Threshold',
  WORKLOAD_FAILURE_THRESHOLD: 'Failure Threshold',
  WORKLOAD_CPU_REQUEST: 'CPU Request',
  WORKLOAD_MEMORY_REQUEST: 'Memory Request',
  WORKLOAD_CPU_LIMIT: 'CPU Limit',
  WORKLOAD_MEMORY_LIMIT: 'Memory Limit',
  WORKLOAD_ADD_VOLUME_MOUNT: 'Add Volume Mount',
  WORKLOAD_ADD_VOLUME: 'Add Volume',
  WORKLOAD_RESOURCE_OPTIONS_FAILED:
    'Failed to load ConfigMaps, Secrets, or persistent volume claims in this project.',
  WORKLOAD_PATH_TYPE_UNSET: 'Do not check path type',
  WORKLOAD_EMPTY_DIR_MEDIUM: 'Storage Medium',
  WORKLOAD_NODE_STORAGE: 'Node Storage',
  WORKLOAD_SIZE_LIMIT: 'Size Limit',
  STARTUP_COMMAND: 'Start Command',
  COMMAND: 'Command',
  PARAMETERS: 'Parameters',

  // Banner
  // List
  HPA_SET_TIP: 'Horizontal pod autoscaling has been set.',
  WORKLOAD_EMPTY_DESC: 'Please create a workload.',
  // List > Create > Basic Information
  CREATE_DEPLOYMENT: 'Create Deployment',
  CREATE_DEPLOYMENT_FAILED: 'Failed to create Deployment.',
  REPLICAS: 'Replicas',
  // List > Create > Pod Settings
  // List > Create > Pod Settings > Add Container > Container Settings
  INVALID_IMAGE: 'Invalid image.',
  INVALID_NAME_DESC:
    'Invalid name. The name can contain only lowercase letters, numbers, and hyphens (-), and must start and end with a lowercase letter or number. The maximum length is 63 characters.',
  NO_IMAGE_FOUND: 'No Image Found',
  CONTAINER_EMPTY_DESC: 'Please add at least one worker container.',
  RESOURC_QUOTAS_UNSET: 'Resource Quotas Unset',
  INSUFFICENT_RESOURCES: 'Insufficent Resources',
  REMAINING_QUOTAS: 'Remaining Quotas',
  // List > Create > Pod Settings > Add Container > Container Settings > Environment Settings
  ENVIRONMENT_INVALID_TIP:
    'The key of an environment variable can contain only letters, numbers, underscores (_), hyphens (-), and periods (.), and must not start with a number.',
  ENVIRONMENT_CANNOT_BE_EMPTY: 'Please set a key for the environment variable.',
  // List > Create > Pod Settings > Port Settings
  WORKLOAD_PORT_NAME_DESC:
    'The port name can contain only lowercase letters, numbers and hyphens (-), and must start with a lowercase letter and end with a lowercase letter or number. The maximum length is 15 characters.',
  // List > Create > Pod Settings > Update Strategy > Rolling Update Settings
  MAX_EXTRA_PODS_DESC:
    'Maximum number or percentage of extra pods allowed during the update process.',
  MAX_EXTRA_PODS: 'Maximum Extra Pods',
  // List > Create > Storage Settings
  AVAILABLE: 'Available',
  IN_USER: 'In use',
  ACCESS_MODE_SCAP: 'Access mode',
  PVC_OR_TEMPLATE_EMPTY:
    'You have enabled Collect Logs on Volumes. Please add at least one persistent volume, temperary volume, or persistent volume claim template and specify the path of container logs.',
  PVC_EMPTY:
    'You have enabled Collect Logs on Volumes. Please add at least one persistent volume or temperary volume and specify the path of container logs.',
  PROJECT_COLLECT_SAVED_DISABLED_DESC:
    'To enable this function, you need to enable Collect Logs on Volumes in Project Settings.',
  COLLECT_LOGS_ON_VOLUMES_DESC:
    'Allow the system to collect container logs saved on volumes. To use this function, you need to mount a volume in read and write mode to a container and set the container to export logs to the volume.',
  // List > Create
  // List > Create > Storage Settings > Mount Volume
  CONTAINER_LOG_PATH: 'Container log path',
  // List > Create > Storage Settings > Mount Volume > Temporary Volume
  CONTAINER_LOG_PATH_TIP:
    'Container log path relative to the volume mount path. Globbing patterns are supported. You can used commas (,) to separate multiple paths.<br /><br /><b>Example</b><br />When the volume mount path is /data, log/*.log indicates that the container log files are all .log files in the /data/log directory.',
  // List > Create > Advanced Settings
  // List > Edit Information
  // List > Edit YAML
  // List > Re-create
  RECREATE_CONFIRM_DESC:
    'Are you sure you want to re-create the {type} {resource}? The pod replicas will be updated according to the update strategy and the service will be interrupted.',
  // List > Delete
  NO_WORKLOAD_RELATED_RESOURCE_DESC: 'No resource related to the workload is found.',
  SELECT_ALL: 'Select All',
  DELETE_WORKLOAD_DESC_SI:
    'You are about to delete the workload {resource}.<br/>Do you want to also delete the resource related to the workload?',
  DELETE_WORKLOAD_DESC_PL:
    'You are about to delete the workloads {resource}.<br/>Do you want to also delete the resources related to the workloads?',
  DELETE_WORKLOAD: 'Delete Workload',
  DELETE_MULTIPLE_WORKLOADS: 'Delete Multiple Workloads',
  DELETE_APP_RESOURCE_TIP:
    'The resource is managed by <strong>{app}</strong>, which may affect the normal use of this app if the resource is deleted. Please enter the {type} name <strong>{resource}</strong> to make sure you understand the risks associated with the operation.',
  STOP_APP_RESOURCE_TIP:
    'The resource is managed by <strong>{app}</strong>, which may affect the normal use of this app if the resource is stopped. Please enter the {type} name <strong>{resource}</strong> to make sure you understand the risks associated with the operation.',
};
