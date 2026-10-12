/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useDetailPage } from '@ks-console/shared';
import type { FormattedSecret } from '@ks-console/shared';

function SecretData(): JSX.Element | null {
  const { detail } = useDetailPage<FormattedSecret>();
  if (!detail) return null;
  return (
    <div>
      {Object.entries(detail.data ?? {}).map(([key, value]) => (
        <div key={key}>
          <strong>{key}</strong>
          <pre>{String(value)}</pre>
        </div>
      ))}
    </div>
  );
}

export default SecretData;
