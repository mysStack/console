/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfigHistoryPage from './index';

/**
 * Route wrapper for the modification history page.
 *
 * The detail view of a ConfigMap or a Secret is the V3 console embedded through wujie, so the
 * history lives on a sibling route of its own instead of a tab inside that page. Opening it
 * leaves the embedded page; the back action returns to it.
 */
export interface ConfigHistoryRouteProps {
  kind: 'ConfigMap' | 'Secret';
}

function ConfigHistoryRoute({ kind }: ConfigHistoryRouteProps): JSX.Element {
  const { cluster, namespace, name } = useParams();
  const navigate = useNavigate();

  return (
    <ConfigHistoryPage
      kind={kind}
      cluster={cluster || ''}
      namespace={namespace || ''}
      name={name || ''}
      onBack={() => navigate(-1)}
    />
  );
}

export default ConfigHistoryRoute;
