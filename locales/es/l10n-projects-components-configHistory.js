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
  CONFIG_HISTORY_LOAD_ERROR: 'Failed to load the modification records',
  CONFIG_HISTORY_CONTENT: 'Content',
  CONFIG_HISTORY_CONTENT_OMITTED: 'content omitted (this revision was too large)',
  CONFIG_HISTORY_FIRST_REVISION: 'This is the oldest record; there is nothing to compare with',
  CONFIG_HISTORY_MANAGED_BY_HELM: 'Helm managed',
  CONFIG_HISTORY_MANAGED_BY_REPLICATOR: 'replicator synced',
  CONFIG_HISTORY_MANAGED_BY_DIRECT: 'directly managed',
  CONFIG_HISTORY_SERIAL: 'Serial number',
  CONFIG_HISTORY_CHANGED_AT: 'Changed at',
  CONFIG_HISTORY_MANAGED_BY: 'Managed by',
  CONFIG_HISTORY_SOURCE_NOTE:
    'This line is not who changed it. managedFields is empty in this cluster, so the caller cannot be derived; what is shown is the reliably derivable managed-by classification.',
};
