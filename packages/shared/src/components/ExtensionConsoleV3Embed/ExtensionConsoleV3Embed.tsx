import React from 'react';
import WujieReact from '../ConsoleV3Embed/index';

import type { ExtensionConsoleV3EmbedProps } from './types';
import { DEFAULT_PROPS } from './constants';

export function ExtensionConsoleV3Embed(props: ExtensionConsoleV3EmbedProps) {
  const finalProps = { ...DEFAULT_PROPS, ...props };
  return <WujieReact {...finalProps} />;
}
