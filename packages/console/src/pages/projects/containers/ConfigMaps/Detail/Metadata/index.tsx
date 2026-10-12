/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { MetaData, useDetailPage } from '@ks-console/shared';
import type { FormattedConfigMap } from '@ks-console/shared';

function ConfigMapMetadata(): JSX.Element {
  const { detail } = useDetailPage<FormattedConfigMap>();
  return <MetaData detail={detail} />;
}

export default ConfigMapMetadata;
