/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import ConsoleV3AliveEmbed from '../../../../components/ConsoleV3AliveEmbed';
function DeploymentDetail(): JSX.Element {
  const url = `//${window.location.host}/consolev3/settings/notification-subscription/subscription-mail/create`;

  return <ConsoleV3AliveEmbed url={url} />;
}

export default DeploymentDetail;
