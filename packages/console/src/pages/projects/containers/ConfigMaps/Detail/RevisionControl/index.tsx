/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfigHistoryPage from '../../../../components/ConfigHistory';

function ConfigMapRevisionControl(): JSX.Element {
  const { cluster = '', namespace = '', name = '' } = useParams();
  const navigate = useNavigate();
  return (
    <ConfigHistoryPage
      kind="ConfigMap"
      cluster={cluster}
      namespace={namespace}
      name={name}
      onBack={() => navigate(-1)}
    />
  );
}

export default ConfigMapRevisionControl;
