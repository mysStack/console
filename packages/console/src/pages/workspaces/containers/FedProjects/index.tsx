/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Banner } from '@kubed/components';
import { Project } from '@kubed/icons';
import ConsoleV3AliveEmbed from '../../../../components/ConsoleV3AliveEmbed';

function FedProjects(): JSX.Element {
  const { workspace } = useParams<'workspace'>();
  const url = `//${window.location.host}/consolev3/workspaces/${workspace}/federatedprojects`;

  return (
    <>
      <Banner
        icon={<Project />}
        title={t('MULTI_CLUSTER_PROJECT_PL')}
        description={t('PROJECT_DESC')}
        className="mb12"
      />
      <div>
        <ConsoleV3AliveEmbed url={url} />
      </div>
    </>
  );
}

export default FedProjects;
