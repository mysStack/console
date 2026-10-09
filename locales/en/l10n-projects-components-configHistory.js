/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

module.exports = {
  CONFIG_HISTORY_TITLE: 'Modification records',
  CONFIG_HISTORY_TAB_DATA: 'Data',
  CONFIG_HISTORY_TAB_HISTORY: 'Modification records',
  CONFIG_HISTORY_TAB_METADATA: 'Metadata',
  CONFIG_HISTORY_TAB_EVENTS: 'Events',
  CONFIG_HISTORY_NEW: 'New',
  CONFIG_HISTORY_BACK: 'Back',
  CONFIG_HISTORY_HINT:
    'Records are created after a ConfigMap or Secret changes. Use them to review what changed and to compare against earlier revisions. At most 10 records are kept.',
  CONFIG_HISTORY_EMPTY: 'No modification records yet',
  CONFIG_HISTORY_LOAD_ERROR: 'Could not read the records',
  CONFIG_HISTORY_CONTENT: 'Data',
  CONFIG_HISTORY_CONTENT_OMITTED: 'Content omitted, it is too large',
  CONFIG_HISTORY_FIRST_REVISION:
    'This is the earliest record; there is nothing before it to compare',
  CONFIG_HISTORY_MANAGED_BY_HELM: 'Helm managed',
  CONFIG_HISTORY_MANAGED_BY_REPLICATOR: 'replicator synced',
  CONFIG_HISTORY_MANAGED_BY_DIRECT: 'directly managed',
  CONFIG_HISTORY_SERIAL: 'Serial number',
  CONFIG_HISTORY_CHANGED_AT: 'Changed at',
  CONFIG_HISTORY_MANAGED_BY: 'Managed by',
  CONFIG_HISTORY_SOURCE_VERSION: 'Source version',
  CONFIG_HISTORY_MANAGED_BY_ATTRIBUTE: 'Managed by',
  CONFIG_HISTORY_UPDATED_AT: 'Updated at',
  CONFIG_HISTORY_SOURCE_NOTE:
    'This line is not who changed it. managedFields is empty in this cluster, so the caller cannot be derived; what is shown is the reliably derivable managed-by classification.',
  CONFIG_HISTORY_LABELS: 'Labels',
  CONFIG_HISTORY_ANNOTATIONS: 'Annotations',
  CONFIG_HISTORY_EVENTS: 'Events',
  CONFIG_HISTORY_METADATA_LOAD_ERROR: 'Could not read metadata',
  CONFIG_HISTORY_EVENTS_LOAD_ERROR: 'Could not read events',
  CONFIG_HISTORY_EVENTS_LOADING: 'Loading events…',
  CONFIG_HISTORY_EVENTS_EMPTY: 'No events',
};
