/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Banner } from '@kubed/components';
import { Icon, secretStore } from '@ks-console/shared';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

export default function Embed() {
  const location = useLocation();
  const params: Record<string, any> = useParams();
  const { cluster } = params;
  const { getDocsUrl } = secretStore;
  const docUrl = getDocsUrl();

  const desc = (
    <div className="banner-desc">
      {t('SERVICE_ACCOUNT_DESC')}
      <Icon name="documentation" size={20} />
      <a href={docUrl} target="_blank">
        {t('LEARN_MORE')}
      </a>
    </div>
  );

  const url = `//${window.location.host}/consolev3/clusters/${cluster}/serviceaccounts${location.search}`;

  return (
    <>
      <Banner
        icon={<Icon name="client" />}
        title={t('SERVICE_ACCOUNT_PL')}
        description={docUrl ? desc : t('SERVICE_ACCOUNT_DESC')}
        className="mb12"
      />
      <ConsoleV3AliveEmbed url={url} />
    </>
  );
}
