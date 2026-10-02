/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useParams } from 'react-router-dom';

function DeploymentDetail(): JSX.Element {
  const { workspace, cluster, namespace, name } = useParams<
    'workspace' | 'cluster' | 'namespace' | 'name'
  >();
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');
  // On a hard refresh the project layout has not populated the shared store
  // yet. Build the same V3 prefix from the route so the detail page does not
  // remain on the loading screen.
  const projectPrefix =
    wujieUrlPrefix ||
    `//${window.location.host}/consolev3/${workspace}/clusters/${cluster}/projects/${namespace}`;

  return (
    <WujieReact
      width="100%"
      height="100%"
      name="consolev3"
      url={`${projectPrefix}/deployments/${name}`}
      sync={false}
    />
  );
}

export default DeploymentDetail;
