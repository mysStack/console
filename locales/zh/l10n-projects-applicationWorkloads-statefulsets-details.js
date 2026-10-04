/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  // More > Roll Back
  // More > Edit Service
  SELECTOR: '选择器',
  // More > Edit Settings > Update Strategy
  // More > Edit Settings > Containers
  // More > Edit Settings > Volumes > Add Persistent Volume Template
  // More > Edit Settings > Volumes > Mount Volume
  // More > Edit Settings > Volumes > Mount Configmap or Secret
  // More > Edit Settings > Pod Scheduling Rules
  // More > Re-Create
  RECREATE: '重新创建',
  RECREATE_SUCCESS_DESC: '重新创建成功。',
  CONFIG_REFERENCE: '配置引用',
  CONFIG_REFERENCE_CLOSE: '关闭',
  CONFIG_REFERENCE_BACK: '返回',
  CONFIG_REFERENCE_CONTAINER: '容器',
  CONFIG_REFERENCE_RESOURCES: 'ConfigMap / Secret',
  CONFIG_REFERENCE_SECRET_NOTICE: '只保存资源名称和前缀，不读取或展示 Secret 内容。',
  CONFIG_REFERENCE_ADD: '添加引用',
  CONFIG_REFERENCE_LOADING: '正在加载资源列表…',
  CONFIG_REFERENCE_LOAD_ERROR: 'ConfigMap/Secret 列表加载失败。',
  CONFIG_REFERENCE_RETRY: '重试',
  CONFIG_REFERENCE_EMPTY: '当前没有配置引用。',
  CONFIG_REFERENCE_PREFIX_PLACEHOLDER: '可选前缀',
  CONFIG_REFERENCE_DUPLICATE: '存在重复的配置引用，请先修正。',
  CONFIG_REFERENCE_NAME_REQUIRED: '请为每一行选择 ConfigMap 或 Secret。',
  CONFIG_REFERENCE_UNAVAILABLE: '引用资源不可用，请重新选择。',
  CONFIG_REFERENCE_AUTO_RELOAD: '配置变化自动滚动更新',
  CONFIG_REFERENCE_AUTO_RELOAD_DESC: '需要集群已安装 Stakater Reloader。',
  CONFIG_REFERENCE_ENABLED: '已开启',
  CONFIG_REFERENCE_DISABLED: '已关闭',
  CONFIG_REFERENCE_CANCEL: '取消',
  CONFIG_REFERENCE_SAVE: '保存',
  CONFIG_REFERENCE_SAVE_SUCCESS: '配置引用已保存',
  CONFIG_REFERENCE_WORKLOAD_LOAD_ERROR: '工作负载加载失败，请返回后重试。',
  CONFIG_REFERENCE_NO_CONTAINERS: '当前 {kind} 没有可配置的容器。',
};
