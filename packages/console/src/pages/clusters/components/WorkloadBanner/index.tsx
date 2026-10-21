/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { get } from 'lodash';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Icon } from '@ks-console/shared';
import { Banner, Navs } from '@kubed/components';

interface IProps {
  title?: string;
  description?: string;
  module: string;
  tabs?: { label: string; value: string }[];
}

const WorkloadBanner = ({
  title = t('WORKLOAD_PL'),
  description = t('WORKLOAD_DESC'),
  module,
  tabs,
}: IProps) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const defaultTabs = [
    {
      value: 'deployments',
      label: t('DEPLOYMENTS'),
    },
    {
      value: 'statefulsets',
      label: t('STATEFULSETS'),
    },
    {
      value: 'daemonsets',
      label: t('DAEMONSETS'),
    },
  ];

  const ICON_TYPES: Record<string, string> = {
    deployments: 'backup',
    statefulsets: 'stateful-set',
    daemonsets: 'deamon-set',
    jobs: 'backup',
    cronjobs: 'backup',
  };

  const pathParts = pathname.split('/').filter(Boolean);
  const type: string = pathParts[pathParts.length - 1];
  const iconName = get(ICON_TYPES, type, 'backup');

  const handleNavChange = (nav: string) => {
    const nextPathParts = [...pathParts];
    nextPathParts[nextPathParts.length - 1] = nav;
    navigate(`/${nextPathParts.join('/')}`);
  };

  return (
    <Banner
      className="mb12"
      icon={<Icon name={iconName} size={40} />}
      title={title}
      description={description}
    >
      <Navs value={module} data={tabs || defaultTabs} onChange={handleNavChange} />
    </Banner>
  );
};

export default WorkloadBanner;
