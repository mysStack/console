/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

export default {
  CONFIG_HISTORY_TITLE: 'Modification history',
  CONFIG_HISTORY_DESC:
    'Records are created when a ConfigMap or Secret changes, so changes and previous revisions can be compared. Up to 10 records are kept.',
  CONFIG_HISTORY_EMPTY: 'No records yet',
  CONFIG_HISTORY_BACK: 'Back',
  CONFIG_HISTORY_SERIAL: 'Serial number',
  CONFIG_HISTORY_CHANGED_AT: 'Changed at',
  CONFIG_HISTORY_MANAGED_BY: 'Managed by',
  CONFIG_HISTORY_MANAGED_BY_HELM: 'Managed by Helm',
  CONFIG_HISTORY_MANAGED_BY_REPLICATOR: 'Synced by replicator',
  CONFIG_HISTORY_MANAGED_BY_DIRECT: 'Directly managed',
  CONFIG_HISTORY_NO_PREVIOUS: 'This is the earliest record; there is nothing before it to compare',
  CONFIG_HISTORY_CURRENT: 'This is the latest record',
  CONFIG_HISTORY_DATA: 'Data',
  CONFIG_HISTORY_LOAD_FAILED: 'Could not read the records',
  CONFIG_HISTORY_RETRY: 'Retry',
  CONFIG_HISTORY_SOURCE_NOTE:
    'This line is not who changed it: managedFields is empty in this cluster, so the caller cannot be derived. What is shown is the reliably derivable managed-by classification.',
  CONFIG_HISTORY_DIFF_PREV: 'Compare with the previous record',
};
