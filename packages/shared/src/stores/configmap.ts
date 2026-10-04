/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import { get } from 'lodash';

import baseStore from './store';
import { getOriginData, getBaseInfo } from '../utils';
import type { FormattedConfigMap, OriginalConfigMap } from '../types';
import { CONFIGMAP_METADATA_ACCEPT, toMetadataNameList } from './secretNameList';
import { request } from '../utils';

const module = 'configmaps';

const mapper = (item: OriginalConfigMap): FormattedConfigMap => {
  return {
    ...getBaseInfo<OriginalConfigMap>(item),
    type: get(item, 'type'),
    data: get(item, 'data'),
    binaryData: get(item, 'binaryData'),
    labels: get(item, 'metadata.labels', {}) as FormattedConfigMap['labels'],
    namespace: get(item, 'metadata.namespace'),
    annotations: get(item, 'metadata.annotations') as unknown as FormattedConfigMap['annotations'],
    _originData: getOriginData<OriginalConfigMap>(item),
  };
};

const BaseStore = baseStore<FormattedConfigMap>({ module, mapper });

const store = {
  ...BaseStore,
  module,
  mapper,
  /** Fetch only ConfigMap metadata names; do not transfer ConfigMap data for selectors. */
  fetchNameListByK8s: async ({ cluster, namespace, ...params }: any = {}): Promise<string[]> => {
    const result: any = await request.get(BaseStore.getListUrl({ cluster, namespace, module }), {
      params,
      headers: { Accept: CONFIGMAP_METADATA_ACCEPT },
    });
    return Array.isArray(result?.items) ? toMetadataNameList(result.items) : [];
  },
};

export default store;
