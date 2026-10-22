/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect, useRef } from 'react';
import { isEmpty, get } from 'lodash';
import EnvVariables from '../Cards/Containers/EnvVariables';
import { getWorkloadIdentityKey, useCacheStore as useStore } from '@ks-console/shared';
import { useEnvStore } from '@ks-console/shared';
import { Loading } from '@kubed/components';

interface IProps {
  detailPropsName: string;
}

const getContainers = (workload: Record<string, any>, module: string) => {
  const { spec, containers = [] } = workload;

  if (module === 'containers') {
    return [workload];
  }

  if (!isEmpty(containers)) {
    return containers;
  }

  if (!isEmpty(spec)) {
    return get(spec, 'template.spec.containers', []);
  }

  return [];
};

const getInitContainers = (workload: Record<string, any>, module: string) => {
  const { spec, initContainers = [] } = workload;

  if (module === 'containers') {
    return [workload];
  }

  if (!isEmpty(initContainers)) {
    return initContainers;
  }

  if (!isEmpty(spec)) {
    return get(spec, 'template.spec.initContainers', []);
  }

  return [];
};

const Env = ({ detailPropsName }: IProps) => {
  const [props] = useStore(detailPropsName);
  const { detail = {}, module } = props;
  const { list, fetchList } = useEnvStore();
  const workloadIdentityKey = getWorkloadIdentityKey(module, detail);
  const detailRef = useRef(detail);
  const fetchListRef = useRef(fetchList);
  detailRef.current = detail;
  fetchListRef.current = fetchList;

  useEffect(() => {
    if (!workloadIdentityKey) {
      return;
    }

    const workload = detailRef.current;
    fetchListRef.current({
      namespace: workload.namespace,
      cluster: workload.cluster,
      containers: getContainers(workload, module),
      initContainers: getInitContainers(workload, module),
    });
  }, [module, workloadIdentityKey]);

  const { data, isLoading } = list;
  return isLoading ? (
    <Loading className="page-loading" />
  ) : (
    <>
      {data.map((container, index) => (
        <EnvVariables detail={container} key={index} expand={index === 0} module={module} />
      ))}
    </>
  );
};

export default Env;
