/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import { PropertiesInput } from '@ks-console/shared';

interface Props {
  value?: Record<string, string>;
  onChange?: (value: Record<string, string>) => void;
  onError?: (error?: { message?: string }) => void;
}

export default function NodeSelectorInput(props: Props) {
  return <PropertiesInput {...props} addText={t('ADD_NODE_SELECTOR')} />;
}
