/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { Events, useDetailPage } from '@ks-console/shared';
import type { FormattedSecret } from '@ks-console/shared';

function SecretEvents(): JSX.Element {
  const { detail } = useDetailPage<FormattedSecret>();
  return <Events detail={detail} module="secrets" />;
}

export default SecretEvents;
