/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  WORKLOAD_SETTINGS_INVALID:
    '更新策略、数量或时间设置无效。请填写非负整数或有效百分比；滚动更新的不可用数量与新增数量不能同时为零。',
  WORKLOAD_TERMINATION_GRACE_PERIOD: '容器组优雅终止',
  WORKLOAD_TERMINATION_GRACE_SECONDS: '终止宽限时间（秒）',

  WORKLOAD_SETTINGS_CONFLICT: '资源已被其他操作更新，本次设置未保存。请取消并重新打开编辑设置。',
  WORKLOAD_SETTINGS_SAVE_FAILED: '保存失败，设置尚未保存。请检查网络和权限后重试。',
  WORKLOAD_SETTINGS_LOAD_FAILED: '无法读取最新工作负载设置，请刷新后重试。',
  VOLUME_MOUNT_PL: '卷挂载',
  WORKLOAD_PRESERVED_VOLUME: '已有 {type} 卷原样保留；此处可编辑其他设置。',
  WORKLOAD_ADD_CONTAINER: '添加工作容器',
  WORKLOAD_ADD_INIT_CONTAINER: '添加初始化容器',
  WORKLOAD_ADD_ENV: '添加环境变量',
  WORKLOAD_CONTAINER_INVALID: '请填写合法的容器名称和镜像。',
  WORKLOAD_CONTAINER_DUPLICATE: '工作容器和初始化容器的名称不能重复。',
  WORKLOAD_ENV_DUPLICATE: '同一容器的环境变量名称不能重复。',
  WORKLOAD_PORT_INVALID: '请填写合法端口（1–65535）、协议和端口名称（可选，最长 15 个字符）。',
  WORKLOAD_PORT_DUPLICATE: '容器端口名称在整个容器组中不能重复。',
  WORKLOAD_PROBE_INVALID: '请填写合法的健康检查类型、路径、端口和时间参数。',
  WORKLOAD_LIFECYCLE_INVALID:
    '请填写合法的生命周期动作、路径、端口或命令；普通初始化容器不支持生命周期动作。',
  WORKLOAD_SECURITY_CONTEXT_INVALID:
    '请填写合法的安全上下文布尔值、整数用户或用户组 ID、SELinux 值和权能名称。',
  WORKLOAD_ANNOTATIONS_INVALID: '请填写合法的 Kubernetes 注解名称和文本值。',
  WORKLOAD_LABELS_INVALID: '请填写合法的 Kubernetes 标签名称和值。',
  WORKLOAD_LABEL_CHECK_FAILED: '无法检查标签是否重复，请检查项目后重试。',
  POD_TEMPLATE_METADATA: '容器组模板元数据',
  WORKLOAD_SCHEDULING_INVALID: '请补全每条容器组调度规则并选择有效目标。',
  WORKLOAD_SCHEDULING_PRESERVED: '保留已有高级调度配置',
  WORKLOAD_NODE_SELECTOR_INVALID: '请填写合法的 Kubernetes 节点选择器键和值。',
  WORKLOAD_TARGET_OPTIONS_FAILED: '无法加载工作负载目标，请检查项目后重试。',
  CONTAINER_SECURITY_CONTEXT: '容器安全上下文',
  POD_SECURITY_CONTEXT: '容器组安全上下文',
  PRIVILEGED_MODE: '特权模式',
  ALLOW_PRIVILEGE_ESCALATION: '允许特权提升',
  ROOT_DIRECTORY_READONLY: '根目录只读',
  USER_GROUP: '用户组',
  RUN_AS_NON_ROOT: '仅允许非 root 用户运行',
  SELINUX_CONTEXT: 'SELinux 上下文',
  CAPABILITIES: '权能',
  WORKLOAD_RESOURCE_INVALID: 'CPU 或内存资源值格式不正确。',
  WORKLOAD_CONFIG_REFERENCE_INVALID: '请选择有效的 ConfigMap 或 Secret。',
  WORKLOAD_VOLUME_INVALID: '请填写合法的存储卷名称、来源和路径。',
  WORKLOAD_VOLUME_DUPLICATE: '存储卷名称不能重复。',
  WORKLOAD_VOLUME_MOUNT_INVALID: '请选择已有存储卷并填写唯一的绝对挂载路径。',
  WORKLOAD_ADD_CONFIG_REFERENCE: '添加配置资源引用',
  WORKLOAD_REFERENCE_TYPE: '资源类型',
  WORKLOAD_REFERENCE_RESOURCE: '配置资源',
  WORKLOAD_SELECT_RESOURCE: '请选择资源',
  WORKLOAD_HEALTH_CHECKS: '健康检查',
  WORKLOAD_INITIAL_DELAY: '初始延迟（秒）',
  WORKLOAD_TIMEOUT: '超时（秒）',
  WORKLOAD_PERIOD: '检查间隔（秒）',
  WORKLOAD_SUCCESS_THRESHOLD: '成功阈值',
  WORKLOAD_FAILURE_THRESHOLD: '失败阈值',
  WORKLOAD_CPU_REQUEST: 'CPU 预留',
  WORKLOAD_MEMORY_REQUEST: '内存预留',
  WORKLOAD_CPU_LIMIT: 'CPU 上限',
  WORKLOAD_MEMORY_LIMIT: '内存上限',
  WORKLOAD_ADD_VOLUME_MOUNT: '添加卷挂载',
  WORKLOAD_ADD_VOLUME: '添加存储卷',
  WORKLOAD_RESOURCE_OPTIONS_FAILED: '无法读取当前项目中的 ConfigMap、Secret 或持久卷声明。',
  WORKLOAD_PATH_TYPE_UNSET: '不检查路径类型',
  WORKLOAD_EMPTY_DIR_MEDIUM: '存储介质',
  WORKLOAD_NODE_STORAGE: '节点存储',
  WORKLOAD_SIZE_LIMIT: '容量上限',
  STARTUP_COMMAND: '启动命令',
  COMMAND: '命令',
  PARAMETERS: '参数',

  // Banner
  // List
  HPA_SET_TIP: '已设置容器组水平自动扩缩策略。',
  WORKLOAD_EMPTY_DESC: '请创建一个工作负载。',
  // List > Create > Basic Information
  CREATE_DEPLOYMENT: '创建部署',
  CREATE_DEPLOYMENT_FAILED: '创建部署失败。',
  REPLICAS: '副本数量',
  // List > Create > Pod Settings
  // List > Create > Pod Settings > Add Container > Container Settings
  INVALID_IMAGE: '镜像无效。',
  INVALID_NAME_DESC:
    '名称无效。名称只能包含小写字母、数字和连字符（-），必须以小写字母或数字开头和结尾，最长 63 个字符。',
  NO_IMAGE_FOUND: '没有找到镜像',
  CONTAINER_EMPTY_DESC: '请添加至少一个工作容器。',
  RESOURC_QUOTAS_UNSET: '资源配额未设置',
  INSUFFICENT_RESOURCES: '资源不足',
  REMAINING_QUOTAS: '剩余配额',
  // List > Create > Pod Settings > Add Container > Container Settings > Environment Settings
  ENVIRONMENT_INVALID_TIP:
    '环境变量的键只能包含字母、数字、下划线（_）、连字符（-）和句点（.），并且不能以数字开头。',
  ENVIRONMENT_CANNOT_BE_EMPTY: '请设置环境变量的键。',
  // List > Create > Pod Settings > Port Settings
  WORKLOAD_PORT_NAME_DESC:
    '名称只能包含小写字母、数字和连字符（-），必须以小写字母开头并以小写字母或数字结尾，最长 15 个字符。',
  // List > Create > Pod Settings > Update Strategy > Rolling Update Settings
  MAX_EXTRA_PODS_DESC: '更新过程中允许的多余容器组副本的最大数量或百分比。',
  MAX_EXTRA_PODS: '最大多余容器组数量',
  // List > Create > Storage Settings
  AVAILABLE: '可用',
  IN_USER: '使用中',
  ACCESS_MODE_SCAP: '访问模式',
  PVC_OR_TEMPLATE_EMPTY:
    '您已启用收集卷上日志，请添加至少一个持久卷、临时卷或持久卷声明模板并指定容器日志所在的路径。',
  PVC_EMPTY:
    '您已启用收集卷上日志，请添加至少一个持久卷、临时卷或持久卷声明模板并指定容器日志所在的路径。',
  PROJECT_COLLECT_SAVED_DISABLED_DESC: '如需启用此功能，您需要在项目设置中启用收集卷上日志。',
  COLLECT_LOGS_ON_VOLUMES_DESC:
    '允许系统收集保存在卷上的容器日志。如需使用此功能，请为容器挂载读写模式的卷并设置容器将日志导出到卷。',
  // List > Create
  // List > Create > Storage Settings > Mount Volume
  CONTAINER_LOG_PATH: '容器日志路径',
  // List > Create > Storage Settings > Mount Volume > Temporary Volume
  CONTAINER_LOG_PATH_TIP:
    '容器日志的路径，相对于卷的挂载路径，支持通配符，可使用半角逗号（,）分隔多个路径。<br /><br /><b>示例</b><br />当卷挂载路径为 /data 时，log/*.log 表示日志文件为 /data/log 目录下所有 .log 格式的文件。',
  // List > Create > Advanced Settings
  // List > Edit Information
  // List > Edit YAML
  // List > Re-create
  RECREATE_CONFIRM_DESC:
    '您确定重新创建{type} {resource} 吗？容器组副本将会根据更新策略更新，同时相关业务将会中断。',
  // List > Delete
  NO_WORKLOAD_RELATED_RESOURCE_DESC: '当前工作负载没有关联的资源。',
  SELECT_ALL: '选择全部',
  DELETE_WORKLOAD_DESC_SI:
    '您即将删除工作负载 {resource}。<br/>请确认是否同时删除以下与工作负载关联的资源。',
  DELETE_WORKLOAD_DESC_PL:
    '您即将删除工作负载 {resource}。<br/>请确认是否同时删除以下与工作负载关联的资源。',
  DELETE_WORKLOAD: '删除工作负载',
  DELETE_MULTIPLE_WORKLOADS: '批量删除工作负载',
  DELETE_APP_RESOURCE_TIP:
    '资源由应用 <strong>{app}</strong> 管理，删除后可能影响应用的正常使用。请输入{type}名称 <strong>{resource}</strong> 以确认您了解此操作的风险。',
  STOP_APP_RESOURCE_TIP:
    '资源由应用 <strong>{app}</strong> 管理，停止后可能影响应用的正常使用。请输入{type}名称 <strong>{resource}</strong> 以确认您了解此操作的风险。',
};
