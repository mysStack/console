/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import WujieReact from 'wujie-react';
import { useCacheStore as useStore } from '@ks-console/shared';

import { useNativeWorkloadBridge } from '../Workloads/NativeWorkloadBridge';

function DaemonSets(): JSX.Element {
  const [wujieUrlPrefix] = useStore<string>('wujieUrlPrefix');
  const nativeWorkloadBridge = useNativeWorkloadBridge();

  return (
    <WujieReact
      width="100%"
      height="100%"
      name="consolev3"
      url={`${wujieUrlPrefix}/daemonsets`}
      props={nativeWorkloadBridge}
      sync={false}
    />
  );
}

export default DaemonSets;
