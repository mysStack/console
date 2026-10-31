/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import * as React from 'react';
import { useLocation } from 'react-router-dom';
import ConsoleV3AliveEmbed from '../../components/ConsoleV3AliveEmbed';

const WhizardTelemetry = () => {
  const location = useLocation();
  const url = `//${window.location.host}/consolev3${location.pathname}${location.search}`;

  return <ConsoleV3AliveEmbed url={url} />;
};

export default WhizardTelemetry;
