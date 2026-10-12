/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useDetailPage } from '@ks-console/shared';
import type { FormattedConfigMap } from '@ks-console/shared';

function ConfigMapData(): JSX.Element | null {
  const { detail } = useDetailPage<FormattedConfigMap>();
  if (!detail) return null;
  return (
    <div>
      {Object.entries(detail.data ?? {}).map(([key, value]) => (
        <div key={key}>
          <strong>{key}</strong>
          <pre>{String(value)}</pre>
        </div>
      ))}
      {Object.entries(detail.binaryData ?? {}).map(([key, value]) => (
        <div key={key}>
          <a
            href={'data:text/plain;base64,' + value}
            download={key}
            target="_blank"
            rel="noreferrer"
          >
            {key}
          </a>
        </div>
      ))}
    </div>
  );
}

export default ConfigMapData;
