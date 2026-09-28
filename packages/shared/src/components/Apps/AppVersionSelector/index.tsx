/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { get, isEmpty } from 'lodash';
import { Select, Tag } from '@kubed/components';

import { AppDetail } from '../../..//types';
import { LabelText } from '../AppInformation';
import { openpitrixStore } from '../../../stores';
import {
  REPOSITORY_SYNC_COMPLETED_EVENT,
  shouldRefreshVersionsForRepositorySync,
} from '../repoVersionRefresh';

const { useAppVersionList } = openpitrixStore;

type Props = {
  appDetail: AppDetail;
  workspace?: string;
  showKeywords?: boolean;
  selectedVersionChange?: (versionID: string) => void;
};

export function AppVersionSelector({
  appDetail,
  workspace,
  showKeywords,
  selectedVersionChange,
}: Props): JSX.Element {
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const { data: versions = [], refresh: refreshVersions } = useAppVersionList(
    {
      workspace,
      appName: appDetail.metadata.name,
    },
    {
      order: 'versionName',
    },
  );
  const versionOptions = useMemo(() => {
    return versions?.map(({ metadata, spec }) => ({
      label: spec.versionName,
      description: dayjs(spec.created).format('YYYY-MM-DD'),
      value: metadata.name,
    }));
  }, [versions]);
  // TODO keywords？？ 该字段缺失
  const keywords = appDetail?.apiVersion
    ?.split(',')
    .map((v: any) => v.trim())
    .filter(Boolean);
  const repositoryName = appDetail.metadata?.labels?.['application.kubesphere.io/repo-name'];

  function handleChangeAppVersion(versionID: string): void {
    setSelectedVersion(versionID);
  }

  useEffect(() => {
    const versionID = get(versions, '[0].metadata.name', '');
    setSelectedVersion(versionID);
  }, [versions]);

  useEffect(() => selectedVersionChange?.(selectedVersion), [selectedVersion]);

  useEffect(() => {
    if (!repositoryName) {
      return undefined;
    }

    const handleRepositorySyncCompleted = (event: Event) => {
      const repoName = (event as CustomEvent<{ repoName?: string }>).detail?.repoName;
      if (shouldRefreshVersionsForRepositorySync(repoName, [repositoryName])) {
        refreshVersions();
      }
    };

    window.addEventListener(REPOSITORY_SYNC_COMPLETED_EVENT, handleRepositorySyncCompleted);
    return () =>
      window.removeEventListener(REPOSITORY_SYNC_COMPLETED_EVENT, handleRepositorySyncCompleted);
  }, [repositoryName, refreshVersions]);

  return (
    <>
      <LabelText>{t('VERSIONS')}</LabelText>
      <Select
        style={{ width: '100%' }}
        options={versionOptions}
        value={selectedVersion}
        onChange={handleChangeAppVersion}
      />
      {showKeywords && (
        <>
          <LabelText style={{ marginTop: '32px' }}>{t('KEYWORDS')}</LabelText>
          <div>
            {isEmpty(keywords)
              ? t('NONE')
              : keywords?.map((v: any, index: number) => (
                  <Tag key={`${v}_${index}`} color="secondary">
                    {v}
                  </Tag>
                ))}
          </div>
        </>
      )}
    </>
  );
}

export default AppVersionSelector;
