/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  CONFIG_HISTORY_TITLE: 'Modification records',
  CONFIG_HISTORY_BACK: 'Back',
  CONFIG_HISTORY_HINT:
    'Records are created after a ConfigMap or Secret changes. Use them to review what changed and to compare against earlier revisions. At most 10 records are kept.',
  CONFIG_HISTORY_EMPTY: 'No modification records yet',
  CONFIG_HISTORY_LOAD_ERROR: '读取修改记录失败',
  CONFIG_HISTORY_CONTENT: '配置数据',
  CONFIG_HISTORY_DIFF_TITLE: '版本對比',
  CONFIG_HISTORY_DIFF_BEFORE: '舊版本 #{version}',
  CONFIG_HISTORY_DIFF_AFTER: '目前版本 #{version}',
  CONFIG_HISTORY_CONFIG_KEY: '配置項',
  CONFIG_HISTORY_CHANGE_TYPE: '變更類型',
  CONFIG_HISTORY_CHANGE_ADDED: '新增',
  CONFIG_HISTORY_CHANGE_REMOVED: '刪除',
  CONFIG_HISTORY_CHANGE_MODIFIED: '修改',
  CONFIG_HISTORY_CHANGE_UNCHANGED: '未變更',
  CONFIG_HISTORY_VALUE_ABSENT: '不存在',
  CONFIG_HISTORY_VALUE_EMPTY: '空值',
  CONFIG_HISTORY_COMPARE_OMITTED: '其中一個版本內容過大，無法逐項對比。',
  CONFIG_HISTORY_NO_DATA: '這兩個版本沒有配置項。',
  CONFIG_HISTORY_CONTENT_OMITTED: '内容过大，已省略',
  CONFIG_HISTORY_FIRST_REVISION: '本条是最早的记录，没有可对比的上一条',
  CONFIG_HISTORY_MANAGED_BY_HELM: 'Helm managed',
  CONFIG_HISTORY_MANAGED_BY_REPLICATOR: 'replicator synced',
  CONFIG_HISTORY_MANAGED_BY_DIRECT: 'directly managed',
  CONFIG_HISTORY_SERIAL: '序列号',
  CONFIG_HISTORY_CHANGED_AT: '变更时间',
  CONFIG_HISTORY_MANAGED_BY: '管理方式',
  CONFIG_HISTORY_SOURCE_NOTE:
    'This line is not who changed it. managedFields is empty in this cluster, so the caller cannot be derived; what is shown is the reliably derivable managed-by classification.',
  CONFIG_HISTORY_SOURCE_NOTE:
    'This line is not who changed it. managedFields is empty in this cluster, so the caller cannot be derived; what is shown is the reliably derivable managed-by classification.',
};
