/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect } from 'react';
import { isEmpty, get } from 'lodash';
import EnvVariables from '../Cards/Containers/EnvVariables';
import { useCacheStore as useStore } from '@ks-console/shared';
import { useEnvStore } from '@ks-console/shared';
import { Loading } from '@kubed/components';
import { isWorkloadEnvDetailReady } from './ready';

interface IProps {
  detailPropsName: string;
}
const Env = ({ detailPropsName }: IProps) => {
  const [props] = useStore(detailPropsName);
  const { detail, module } = props || {};
  const { list, fetchList } = useEnvStore();

  const getContainers = () => {
    const { spec, containers = [] } = detail;

    if (module === 'containers') {
      return [detail];
    }

    if (!isEmpty(containers)) {
      return containers;
    }

    if (!isEmpty(spec)) {
      return get(spec, 'template.spec.containers', []);
    }

    return [];
  };

  const getInitContainers = () => {
    const { spec, initContainers = [] } = detail;

    if (module === 'containers') {
      return [detail];
    }

    if (!isEmpty(initContainers)) {
      return initContainers;
    }

    if (!isEmpty(spec)) {
      return get(spec, 'template.spec.initContainers', []);
    }

    return [];
  };

  const fetchData = () => {
    if (!isWorkloadEnvDetailReady(detail)) return;
    fetchList({
      namespace: detail.namespace,
      cluster: detail.cluster,
      containers: getContainers(),
      initContainers: getInitContainers(),
    });
  };

  useEffect(() => {
    fetchData();
  }, [detail]);

  const { data, isLoading } = list;
  if (!isWorkloadEnvDetailReady(detail) || isLoading) {
    return <Loading className="page-loading" />;
  }
  return (
    <>
      {data.map((container, index) => (
        <EnvVariables detail={container} key={index} expand={index === 0} module={module} />
      ))}
    </>
  );
};

export default Env;
