/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Events, useDetailPage } from '@ks-console/shared';
import type { FormattedConfigMap } from '@ks-console/shared';

function ConfigMapEvents(): JSX.Element {
  const { detail } = useDetailPage<FormattedConfigMap>();
  return <Events detail={detail} module="configmaps" />;
}

export default ConfigMapEvents;
