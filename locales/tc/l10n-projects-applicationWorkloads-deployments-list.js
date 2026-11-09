/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  WORKLOAD_IMAGE_RETRY: '重試映像查詢',
  WORKLOAD_IMAGE_SEARCH: '搜尋映像',
  WORKLOAD_IMAGE_SEARCH_SUBMIT: '搜尋映像倉庫',
  WORKLOAD_IMAGE_RESULTS: '映像搜尋結果',
  WORKLOAD_IMAGE_TAG_PREVIOUS: '上一頁標籤',
  WORKLOAD_IMAGE_TAG_NEXT: '下一頁標籤',
  WORKLOAD_IMAGE_SEARCH_FAILED: '映像搜尋失敗，請重試；仍可手動填寫映像。',
  WORKLOAD_IMAGE_LOOKUP_FAILED: '無法讀取映像標籤或詳情，請重試；已填寫的映像將保留。',
  WORKLOAD_IMAGE_REGISTRY_FAILED:
    '無法讀取所選映像倉庫資訊，請檢查權限；仍可手動填寫完整映像位址。',
  WORKLOAD_IMAGE_SIZE: '映像大小（位元組）',
  WORKLOAD_IMAGE_LAYERS: '映像層數',
  WORKLOAD_SETTINGS_INVALID:
    '更新策略、數量或時間設定無效。請填寫非負整數或有效百分比；不可用數量與新增數量不能同時為零。',
  WORKLOAD_TERMINATION_GRACE_PERIOD: '容器組優雅終止',
  WORKLOAD_TERMINATION_GRACE_SECONDS: '終止寬限時間（秒）',

  WORKLOAD_SETTINGS_CONFLICT: '資源已被其他操作更新，本次設定未儲存。請取消並重新開啟編輯設定。',
  WORKLOAD_SETTINGS_SAVE_FAILED: '儲存失敗，設定尚未儲存。請檢查網路與權限後重試。',
  WORKLOAD_SETTINGS_LOAD_FAILED: '無法讀取最新工作負載設定，請重新整理後重試。',
  WORKLOAD_DETAIL_LOAD_FAILED: '無法載入工作負載詳情，請重新整理後重試。',
  VOLUME_MOUNT_PL: '卷掛載',
  WORKLOAD_PRESERVED_VOLUME: '現有 {type} 卷原樣保留；此處可編輯其他設置。',
  WORKLOAD_ADD_CONTAINER: '新增工作容器',
  WORKLOAD_ADD_INIT_CONTAINER: '新增初始化容器',
  WORKLOAD_ADD_ENV: '新增環境變數',
  WORKLOAD_CONTAINER_INVALID: '請填寫合法的容器名稱和映像。',
  WORKLOAD_CONTAINER_DUPLICATE: '工作容器和初始化容器的名稱不能重複。',
  WORKLOAD_ENV_DUPLICATE: '同一容器的環境變數名稱不能重複。',
  WORKLOAD_PORT_INVALID: '請填寫合法連接埠（1–65535）、協定和連接埠名稱（選填，最長 15 個字元）。',
  WORKLOAD_PORT_DUPLICATE: '容器連接埠名稱在整個容器群組中不能重複。',
  WORKLOAD_PROBE_INVALID: '請填寫合法的健康檢查類型、路徑、連接埠和時間參數。',
  WORKLOAD_LIFECYCLE_INVALID:
    '請填寫合法的生命週期動作、路徑、連接埠或命令；一般初始化容器不支援生命週期動作。',
  WORKLOAD_SECURITY_CONTEXT_INVALID:
    '請填寫合法的安全上下文布林值、整數用戶或用戶組 ID、SELinux 值和權能名稱。',
  WORKLOAD_ANNOTATIONS_INVALID: '請填寫合法的 Kubernetes 註解名稱和文字值。',
  WORKLOAD_LABELS_INVALID: '請填寫合法的 Kubernetes 標籤名稱和值。',
  WORKLOAD_LABEL_CHECK_FAILED: '無法檢查標籤是否重複，請檢查項目後重試。',
  POD_TEMPLATE_METADATA: '容器組範本中繼資料',
  WORKLOAD_SCHEDULING_INVALID: '請補全每條容器組調度規則並選擇有效目標。',
  WORKLOAD_SCHEDULING_PRESERVED: '保留已有進階調度設定',
  WORKLOAD_NODE_SELECTOR_INVALID: '請填寫合法的 Kubernetes 節點選擇器鍵和值。',
  WORKLOAD_TARGET_OPTIONS_FAILED: '無法載入工作負載目標，請檢查項目後重試。',
  CONTAINER_SECURITY_CONTEXT: '容器 Security Context',
  POD_SECURITY_CONTEXT: '容器組 Security Context',
  PRIVILEGED_MODE: '特權模式',
  ALLOW_PRIVILEGE_ESCALATION: '允許擴大特權 (AllowPrivilegeEscalation)',
  ROOT_DIRECTORY_READONLY: '文件系統 root 唯讀 (ReadOnlyRootFilesystem)',
  USER_GROUP: '用戶組',
  RUN_AS_NON_ROOT: '僅允許非 Root 用戶',
  SELINUX_CONTEXT: 'SELinux 上下文',
  CAPABILITIES: 'Capabilities',
  WORKLOAD_RESOURCE_INVALID: 'CPU 或記憶體資源值格式不正確。',
  WORKLOAD_CONFIG_REFERENCE_INVALID: '請選擇有效的 ConfigMap 或 Secret。',
  WORKLOAD_VOLUME_INVALID: '請填寫合法的儲存卷名稱、來源和路徑。',
  WORKLOAD_VOLUME_DUPLICATE: '儲存卷名稱不能重複。',
  WORKLOAD_VOLUME_MOUNT_INVALID: '請選擇已有儲存卷並填寫唯一的絕對掛載路徑。',
  WORKLOAD_ADD_CONFIG_REFERENCE: '新增配置資源引用',
  WORKLOAD_REFERENCE_TYPE: '資源類型',
  WORKLOAD_REFERENCE_RESOURCE: '配置資源',
  WORKLOAD_SELECT_RESOURCE: '請選擇資源',
  WORKLOAD_HEALTH_CHECKS: '健康檢查',
  WORKLOAD_INITIAL_DELAY: '初始延遲（秒）',
  WORKLOAD_TIMEOUT: '逾時（秒）',
  WORKLOAD_PERIOD: '檢查間隔（秒）',
  WORKLOAD_SUCCESS_THRESHOLD: '成功閾值',
  WORKLOAD_FAILURE_THRESHOLD: '失敗閾值',
  WORKLOAD_CPU_REQUEST: 'CPU 預留',
  WORKLOAD_MEMORY_REQUEST: '記憶體預留',
  WORKLOAD_CPU_LIMIT: 'CPU 上限',
  WORKLOAD_MEMORY_LIMIT: '記憶體上限',
  WORKLOAD_ADD_VOLUME_MOUNT: '新增卷掛載',
  WORKLOAD_ADD_VOLUME: '新增儲存卷',
  WORKLOAD_RESOURCE_OPTIONS_FAILED: '無法讀取目前專案中的 ConfigMap、Secret 或持久卷宣告。',
  WORKLOAD_PATH_TYPE_UNSET: '不檢查路徑類型',
  WORKLOAD_EMPTY_DIR_MEDIUM: '儲存介質',
  WORKLOAD_NODE_STORAGE: '節點儲存',
  WORKLOAD_SIZE_LIMIT: '容量上限',
  STARTUP_COMMAND: '啟動命令',
  COMMAND: '命令',
  PARAMETERS: '參數',

  // Banner
  // List
  HPA_SET_TIP: '已設置彈性伸縮策略',
  WORKLOAD_EMPTY_DESC:
    '工作負載 (Workload) 通常是訪問服務的實際載體, 也是對節點紀錄收集、監控等系統應用的實際運行載體，是對一組容器組 (Pod) 的抽象模型。',
  // List > Create > Basic Information
  CREATE_DEPLOYMENT: '建立部署',
  CREATE_DEPLOYMENT_FAILED: '建立部署失敗。',
  REPLICAS: '副本數量',
  // List > Create > Pod Settings
  // List > Create > Pod Settings > Add Container > Container Settings
  INVALID_IMAGE: '鏡像無效。',
  INVALID_NAME_DESC:
    'Invalid name. The name can contain only lowercase letters, numbers, and hyphens (-), and must start and end with a lowercase letter or number. The maximum length is 63 characters.',
  NO_IMAGE_FOUND: '沒有找到此鏡像',
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
  MAX_EXTRA_PODS_DESC: '升級過程中「允許超出副本數量的容器組」的最大數量或百分比',
  MAX_EXTRA_PODS: '容器組最大超出數量',
  // List > Create > Storage Settings
  AVAILABLE: '閒置',
  IN_USER: '使用中',
  ACCESS_MODE_SCAP: '訪問模式',
  PVC_TEMPLATE_NAME: 'PVC 模板名稱',
  PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL: '持久卷聲明模板',
  WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE: '新增持久卷聲明模板',
  WORKLOAD_VOLUME_CLAIM_INVALID: '請輸入有效的 PVC 模板名稱、容量、存取模式和儲存類別。',
  WORKLOAD_VOLUME_CLAIM_DUPLICATE: 'PVC 模板名稱不能重複。',
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
  CONTAINER_LOG_PATH: '容器紀錄相對路徑',
  // List > Create > Storage Settings > Mount Volume > Temporary Volume
  CONTAINER_LOG_PATH_TIP:
    '容器紀錄相對路徑是從容器掛載路徑開始的路徑，可以 glob 方式給出，多組時以英文逗号分隔。例如當容器掛載路徑為 /data 時，容器紀錄相對路徑配置為 log/*.log，表示匹配 /data/log 目錄下所有 .log 後缀文件。<br/>若需要匹配 /data/log 目錄及其子目錄下的所有 .log 後缀文件，可將容器紀錄相對路徑配置為 log/**/*.log',
  // List > Create > Advanced Settings
  // List > Edit Information
  // List > Edit YAML
  // List > Re-create
  RECREATE_CONFIRM_DESC:
    '您即將重新部署工作負載 {resource} ({type}) , 容器組將根據更新策略進行重新部署，您的業務可能會被暫時中斷。',
  // List > Delete
  NO_WORKLOAD_RELATED_RESOURCE_DESC: 'No resource related to the workload is found.',
  SELECT_ALL: '選擇全部',
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
  WORKLOAD_ENV_SOURCE: '變數來源',
  WORKLOAD_ENV_FIELD_PATH: '容器組欄位路徑',
  WORKLOAD_ENV_RESOURCE: '容器資源引用',
  WORKLOAD_ENV_DIVISOR: '資源換算單位',
  WORKLOAD_REFERENCE_OPTIONAL: '允許資源或鍵不存在',
  WORKLOAD_ENV_REFERENCE_INVALID:
    '請輸入有效且唯一的變數來源、資源名稱、鍵或欄位，資源換算單位必須大於零。',
};
