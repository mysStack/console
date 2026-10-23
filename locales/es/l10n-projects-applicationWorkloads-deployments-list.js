/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  WORKLOAD_SETTINGS_INVALID:
    'Estrategia, cantidad o duración no válidas. Use enteros no negativos o porcentajes válidos; maxUnavailable y maxSurge no pueden ser cero a la vez.',
  WORKLOAD_TERMINATION_GRACE_PERIOD: 'Terminación ordenada del pod',
  WORKLOAD_TERMINATION_GRACE_SECONDS: 'Período de terminación (segundos)',

  WORKLOAD_SETTINGS_CONFLICT:
    'Otra operación actualizó el recurso. Cancela y vuelve a abrir Editar ajustes.',
  WORKLOAD_SETTINGS_SAVE_FAILED:
    'No se guardaron los ajustes. Comprueba la red y los permisos e inténtalo de nuevo.',
  WORKLOAD_SETTINGS_LOAD_FAILED:
    'No se pudieron cargar los ajustes actuales. Actualiza e inténtalo de nuevo.',
  VOLUME_MOUNT_PL: 'Montajes de volumen',
  WORKLOAD_PRESERVED_VOLUME: 'El volumen {type} existente se conserva al editar otros ajustes.',
  WORKLOAD_ADD_CONTAINER: 'Añadir contenedor',
  WORKLOAD_ADD_INIT_CONTAINER: 'Añadir contenedor de inicio',
  WORKLOAD_ADD_ENV: 'Añadir variable de entorno',
  WORKLOAD_CONTAINER_INVALID: 'Introduce un nombre de contenedor y una imagen válidos.',
  WORKLOAD_CONTAINER_DUPLICATE: 'Los nombres de los contenedores deben ser únicos.',
  WORKLOAD_ENV_DUPLICATE: 'Las variables de entorno de un contenedor deben tener nombres únicos.',
  WORKLOAD_PORT_INVALID:
    'Introduce un puerto válido (1–65535), un protocolo y un nombre opcional (hasta 15 caracteres).',
  WORKLOAD_PORT_DUPLICATE: 'Los nombres de los puertos deben ser únicos en el Pod.',
  WORKLOAD_PROBE_INVALID:
    'Introduzca un tipo, una ruta, un puerto y tiempos válidos para la sonda.',
  WORKLOAD_RESOURCE_INVALID: 'Introduzca cantidades válidas de CPU y memoria.',
  WORKLOAD_LIFECYCLE_INVALID:
    'Introduzca una acción de ciclo de vida, ruta, puerto o comando válido. Los contenedores de inicio normales no admiten estas acciones.',
  WORKLOAD_SECURITY_CONTEXT_INVALID:
    'Introduzca valores booleanos, identificadores enteros, valores SELinux y nombres de capacidades válidos.',
  WORKLOAD_ANNOTATIONS_INVALID:
    'Introduzca nombres de anotación de Kubernetes y valores de texto válidos.',
  WORKLOAD_LABELS_INVALID: 'Introduzca nombres y valores de etiquetas de Kubernetes válidos.',
  WORKLOAD_LABEL_CHECK_FAILED:
    'No se pudieron comprobar las etiquetas duplicadas. Compruebe el proyecto e inténtelo de nuevo.',
  POD_TEMPLATE_METADATA: 'Metadatos de la plantilla de pod',
  WORKLOAD_SCHEDULING_INVALID:
    'Complete cada regla de programación del Pod y seleccione un destino válido.',
  WORKLOAD_SCHEDULING_PRESERVED: 'Conservar la programación avanzada existente',
  WORKLOAD_NODE_SELECTOR_INVALID:
    'Introduzca claves y valores válidos para el selector de nodos de Kubernetes.',
  WORKLOAD_TARGET_OPTIONS_FAILED:
    'No se pudieron cargar los destinos. Compruebe el proyecto e inténtelo de nuevo.',
  CONTAINER_SECURITY_CONTEXT: 'Contexto de seguridad del contenedor',
  POD_SECURITY_CONTEXT: 'Contexto de seguridad de pod',
  PRIVILEGED_MODE: 'Privilegiado',
  ALLOW_PRIVILEGE_ESCALATION: 'AllowPrivilegeEscalation',
  ROOT_DIRECTORY_READONLY: 'ReadOnlyRootFilesystem',
  USER_GROUP: 'Grupo de usuario',
  RUN_AS_NON_ROOT: 'Ejecutar como no root',
  SELINUX_CONTEXT: 'SELinux Context',
  CAPABILITIES: 'Capabilities',
  WORKLOAD_CONFIG_REFERENCE_INVALID: 'Seleccione un ConfigMap o Secret válido.',
  WORKLOAD_VOLUME_INVALID: 'Introduzca un nombre, un origen y una ruta válidos para el volumen.',
  WORKLOAD_VOLUME_DUPLICATE: 'Los nombres de volumen deben ser únicos.',
  WORKLOAD_VOLUME_MOUNT_INVALID:
    'Seleccione un volumen existente y una ruta de montaje absoluta única.',
  WORKLOAD_ADD_CONFIG_REFERENCE: 'Añadir referencia de configuración',
  WORKLOAD_REFERENCE_TYPE: 'Tipo de recurso',
  WORKLOAD_REFERENCE_RESOURCE: 'Recurso de configuración',
  WORKLOAD_SELECT_RESOURCE: 'Seleccione un recurso',
  WORKLOAD_HEALTH_CHECKS: 'Comprobaciones de estado',
  WORKLOAD_INITIAL_DELAY: 'Retraso inicial (s)',
  WORKLOAD_TIMEOUT: 'Tiempo de espera (s)',
  WORKLOAD_PERIOD: 'Período (s)',
  WORKLOAD_SUCCESS_THRESHOLD: 'Umbral de éxito',
  WORKLOAD_FAILURE_THRESHOLD: 'Umbral de fallo',
  WORKLOAD_CPU_REQUEST: 'Solicitud de CPU',
  WORKLOAD_MEMORY_REQUEST: 'Solicitud de memoria',
  WORKLOAD_CPU_LIMIT: 'Límite de CPU',
  WORKLOAD_MEMORY_LIMIT: 'Límite de memoria',
  WORKLOAD_ADD_VOLUME_MOUNT: 'Añadir montaje de volumen',
  WORKLOAD_ADD_VOLUME: 'Añadir volumen',
  WORKLOAD_RESOURCE_OPTIONS_FAILED: 'No se pudieron cargar ConfigMaps, Secrets o PVC del proyecto.',
  WORKLOAD_PATH_TYPE_UNSET: 'No comprobar el tipo de ruta',
  WORKLOAD_EMPTY_DIR_MEDIUM: 'Medio de almacenamiento',
  WORKLOAD_NODE_STORAGE: 'Almacenamiento del nodo',
  WORKLOAD_SIZE_LIMIT: 'Límite de tamaño',
  STARTUP_COMMAND: 'Comando de inicio',
  COMMAND: 'Comando',
  PARAMETERS: 'Parámetros',

  // Banner
  // List
  HPA_SET_TIP: 'El Autoscaling Horizontal de Pods ha sido configurado',
  WORKLOAD_EMPTY_DESC:
    'La carga de trabajo suele ser el operador real para acceder a los servicios y también es el operador real para las aplicaciones del sistema, como la recopilación y supervisión de registros de nodos. Workload es también un modelo abstracto para un grupo de Pods.',
  // List > Create > Basic Information
  CREATE_DEPLOYMENT: 'Crear deployment',
  CREATE_DEPLOYMENT_FAILED: 'No se pudo crear el deployment.',
  REPLICAS: 'Réplicas',
  // List > Create > Pod Settings
  // List > Create > Pod Settings > Add Container > Container Settings
  INVALID_IMAGE: 'Imagen inválida.',
  INVALID_NAME_DESC:
    'Invalid name. The name can contain only lowercase letters, numbers, and hyphens (-), and must start and end with a lowercase letter or number. The maximum length is 63 characters.',
  NO_IMAGE_FOUND: 'No encontré esta imagen',
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
  MAX_EXTRA_PODS_DESC: 'El número máximo de pods permitido durante una actualización continua',
  MAX_EXTRA_PODS: 'El número máximo disponible de pods',
  // List > Create > Storage Settings
  AVAILABLE: 'En desuso',
  IN_USER: 'En uso',
  ACCESS_MODE_SCAP: 'Modo de acceso admitido',
  PVC_OR_TEMPLATE_EMPTY:
    'You have enabled Collect Logs on Volumes. Please add at least one persistent volume, temperary volume, or persistent volume claim template and specify the path of container logs.',
  PVC_EMPTY:
    'You have enabled Collect Logs on Volumes. Please add at least one persistent volume or temperary volume and specify the path of container logs.',
  PROJECT_COLLECT_SAVED_DISABLED_DESC:
    'Please contact the project administrator to enable disk log collection in <b>Project Settings</b> > <b>Advanced Settings</b>.',
  COLLECT_LOGS_ON_VOLUMES_DESC:
    'After you add a volume (ReadAndWrite mode), you can collect logs inside the volume. When you enable disk log collection, the Filebeat image will be used as a sidecar pattern and injected into the Pod to collect logs.',
  // List > Create
  // List > Create > Storage Settings > Mount Volume
  CONTAINER_LOG_PATH: 'ruta relativa del registro de contenedor',
  // List > Create > Storage Settings > Mount Volume > Temporary Volume
  CONTAINER_LOG_PATH_TIP:
    'La ruta relativa del registro del contenedor es la ruta desde la ruta de montaje del módulo, que se puede proporcionar en modo global. Cuando hay varios grupos, sepárelos por comas. Por ejemplo, cuando la ruta de montaje del pod es / data, la ruta relativa del registro de pod se configura como log / *. Log, lo que significa que todos los archivos de sufijos .log en el directorio / data / log coinciden. Si necesita hacer coincidir todos los archivos de sufijos .log en el directorio / data / log y sus subdirectorios, puede configurar la ruta relativa del registro de pod a log / ** / *. Log.',
  // List > Create > Advanced Settings
  // List > Edit Information
  // List > Edit YAML
  // List > Re-create
  RECREATE_CONFIRM_DESC:
    'Está a punto de volver a implementar la carga de trabajo {resource} ({type}), el pod se volverá a implementar de acuerdo con la estrategia de actualización y su negocio puede verse interrumpido temporalmente.',
  // List > Delete
  NO_WORKLOAD_RELATED_RESOURCE_DESC: 'No resource related to the workload is found.',
  SELECT_ALL: 'Seleccionar todo',
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
