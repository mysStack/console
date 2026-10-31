/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Banner } from '@kubed/components';
import { Catalog } from '@kubed/icons';
import ConsoleV3AliveEmbed from '../../../../../components/ConsoleV3AliveEmbed';

export default function Embed() {
  const location = useLocation();
  const params: Record<string, any> = useParams();
  const { cluster } = params;
  const search = location.search ? `/${location.search}` : '';
  const url = `//${window.location.host}/consolev3/clusters/${cluster}/volume-snapshot-classes${search}`;

  const banner = {
    icon: <Catalog />,
    title: t('VOLUME_SNAPSHOT_CLASS_PL'),
    description: t('VOLUME_SNAPSHOT_CLASS_DESC'),
  };

  return (
    <>
      <Banner className="mb12" {...banner} />
      <ConsoleV3AliveEmbed url={url} />
    </>
  );
}
