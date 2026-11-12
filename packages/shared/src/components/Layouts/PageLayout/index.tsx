/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React from 'react';
import type { PropsWithChildren } from 'react';
import { Banner } from '@kubed/components';
import type { BannerProps } from '@kubed/components';

export type PageLayoutProps = PropsWithChildren<
  Pick<BannerProps, 'title' | 'description' | 'icon'>
>;

export default function PageLayout({ children, ...banner }: PageLayoutProps) {
  return (
    <>
      <Banner {...banner} className="mb12" />
      {children}
    </>
  );
}
