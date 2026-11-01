/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

function ApplicationDetail(): JSX.Element {
  const { workspace, namespace, name } = useParams<'workspace' | 'namespace' | 'name'>();
  // eslint-disable-next-line max-len
  const url = `//${window.location.host}/consolev3/${workspace}/federatedprojects/${namespace}/applications/${name}`;

  return <ConsoleV3AliveEmbed url={url} />;
}

export default ApplicationDetail;
