/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import ConfigHistoryPage from '../../../components/ConfigHistory/index.tsx';

function SecretRevisionControl(): JSX.Element {
  const { cluster = '', namespace = '', name = '' } = useParams();
  const navigate = useNavigate();
  return (
    <ConfigHistoryPage
      kind="Secret"
      cluster={cluster}
      namespace={namespace}
      name={name}
      onBack={() => navigate(-1)}
    />
  );
}

export default SecretRevisionControl;
