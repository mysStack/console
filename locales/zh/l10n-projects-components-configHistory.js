/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  CONFIG_HISTORY_TITLE: '修改记录',
  CONFIG_HISTORY_BACK: '返回',
  CONFIG_HISTORY_HINT:
    '系统在配置字典或保密字典变更后生成修改记录，可用于查看变更内容与对比历史版本。最多保留 10 条修改记录。',
  CONFIG_HISTORY_EMPTY: '暂无修改记录',
  CONFIG_HISTORY_LOAD_ERROR: '读取修改记录失败',
  CONFIG_HISTORY_CONTENT: '配置数据',
  CONFIG_HISTORY_CONTENT_OMITTED: '内容过大，本条未保存内容',
  CONFIG_HISTORY_FIRST_REVISION: '本条是最早的记录，没有可对比的上一条',
  CONFIG_HISTORY_MANAGED_BY_HELM: 'Helm 管理',
  CONFIG_HISTORY_MANAGED_BY_REPLICATOR: 'replicator 同步',
  CONFIG_HISTORY_MANAGED_BY_DIRECT: '直接管理',
  CONFIG_HISTORY_SERIAL: '序列号',
  CONFIG_HISTORY_CHANGED_AT: '变更时间',
  CONFIG_HISTORY_MANAGED_BY: '管理方式',
  CONFIG_HISTORY_SOURCE_NOTE:
    '?????????????????? managedFields ???????? Helm / kubectl / ???????????????????????????Helm ??????? meta.helm.sh/release-name??replicator ??????? replicator.v1.mittwald.de/*???????????',
  CONFIG_HISTORY_SOURCE_NOTE:
    '这一行不是「谁改的」——实测本集群的 managedFields 为空，无法推导出 Helm / kubectl / 控制台等具体调用者。这里显示的是可可靠推导的管理方式：Helm 管理（对象上有 meta.helm.sh/release-name）、replicator 同步（对象上有 replicator.v1.mittwald.de/*）、其余归为直接管理。',
};
