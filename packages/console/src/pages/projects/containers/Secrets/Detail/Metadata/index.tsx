/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { MetaData, useDetailPage } from '@ks-console/shared';
import type { FormattedSecret } from '@ks-console/shared';

function SecretMetadata(): JSX.Element {
  const { detail } = useDetailPage<FormattedSecret>();
  return <MetaData detail={detail} />;
}

export default SecretMetadata;
