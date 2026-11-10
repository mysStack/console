/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import React, { useEffect, useMemo, useState } from 'react';
import { isEmpty } from 'lodash';
import { saveAs } from 'file-saver';
import { useQuery } from 'react-query';
import { Loading, notify, Tooltip } from '@kubed/components';
import { Download, Refresh, Start, Stop } from '@kubed/icons';
import { checkName } from '../../../stores/pod';
import { useContainerLogFollow, useContainerLogQuery } from '../../../stores/container';
import { findLogMatches, splitLogLines, visibleLineNumbers, wrapMatchIndex } from './match';
import { DEFAULT_RELATIVE_TIME } from './relativeTime';
import { RelativeTimeSelector } from './RelativeTimeSelector';
import { LogSearchBar } from './SearchBar';
import { LogLines } from './LogLines';
import {
  ContentCard,
  EmptyWrapper,
  LogBody,
  LogPanel,
  OutlineButton,
  Toolbar,
  ToolbarGroup,
} from './styles';

interface Props {
  isRealtime?: boolean;
  cluster?: string;
  namespace?: string;
  podName?: string;
  containerName?: string;
  gatewayName?: string;
  gatewayNamespace?: string;
  downloadFilename?: string;
}

function ContainerLog({
  isRealtime,
  cluster,
  namespace,
  podName,
  containerName,
  gatewayName,
  gatewayNamespace,
  downloadFilename,
}: Props) {
  const [selfRealtime, setSelfRealtime] = useState(!!isRealtime);
  const [timeRange, setTimeRange] = useState(DEFAULT_RELATIVE_TIME);
  const [keyword, setKeyword] = useState('');
  const [filterActive, setFilterActive] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: hasContainer } = useQuery([], async () => {
    const res = await checkName({
      cluster,
      namespace,
      name: podName,
    });
    return res.exist;
  });

  const logParams = useMemo(
    () => ({
      container: containerName,
      tailLines: 1000,
      timestamps: true,
      sinceSeconds: timeRange.seconds,
      follow: selfRealtime,
    }),
    [containerName, timeRange.seconds, selfRealtime],
  );

  const namespaceName = gatewayName ? gatewayNamespace : namespace;

  const { data: followLogs, refetch: refetchFollowLog } = useContainerLogFollow({
    cluster,
    namespace: namespaceName,
    podName,
    gateways: gatewayName,
    params: logParams,
    enabled: selfRealtime && hasContainer,
  });

  const {
    data: queryLogs,
    refetch: refetchQueryLog,
    isLoading,
    isRefetching,
  } = useContainerLogQuery({
    cluster,
    namespace: namespaceName,
    podName,
    gateways: gatewayName,
    params: logParams,
    enabled: !selfRealtime && hasContainer,
  });

  const logs = (selfRealtime ? (followLogs ?? queryLogs) : queryLogs) || '';
  const lines = useMemo(() => splitLogLines(logs), [logs]);
  const matches = useMemo(() => findLogMatches(lines, keyword), [lines, keyword]);
  const lineNumbers = useMemo(
    () => visibleLineNumbers(lines.length, matches, filterActive),
    [lines.length, matches, filterActive],
  );
  const hasLogs = !isEmpty(logs);
  const showLoading = isLoading || isRefetching;

  useEffect(() => {
    setCurrentIndex(0);
    if (matches.length === 0) {
      setFilterActive(false);
    }
  }, [keyword, timeRange.seconds, matches.length]);

  const handleDownload = () => {
    if (!logs) {
      notify.custom(t('NO_LOG_DATA_FOUND_TIP'));
      return;
    }
    const blob = new Blob([logs], { type: 'text/plain;charset=utf-8' });
    const filename = downloadFilename || containerName;
    saveAs(blob, `${filename}.log`);
  };

  const handleRefresh = () => {
    if (selfRealtime) {
      refetchFollowLog();
    } else {
      refetchQueryLog();
    }
  };

  return (
    <ContentCard>
      <Toolbar>
        <ToolbarGroup>
          <RelativeTimeSelector value={timeRange} onChange={setTimeRange} />
          <Tooltip
            content={t(
              selfRealtime ? 'STOP_REAL_TIME_CONTAINER_LOG' : 'START_REAL_TIME_CONTAINER_LOG',
            )}
          >
            <OutlineButton
              type="button"
              $active={selfRealtime}
              data-test="container-log-realtime"
              onClick={() => setSelfRealtime(current => !current)}
            >
              {selfRealtime ? <Stop size={16} color="#FFF" fill="#FFF" /> : <Start size={16} />}
              {t(selfRealtime ? 'STOP_REAL_TIME' : 'START_REAL_TIME')}
            </OutlineButton>
          </Tooltip>
        </ToolbarGroup>
        <ToolbarGroup>
          <Tooltip content={t('REFRESH')}>
            <OutlineButton type="button" data-test="container-log-refresh" onClick={handleRefresh}>
              <Refresh size={16} color="#36435C" fill="#C1C9D1" />
              {t('REFRESH')}
            </OutlineButton>
          </Tooltip>
          <Tooltip content={t('DOWNLOAD')}>
            <OutlineButton type="button" data-test="container-log-export" onClick={handleDownload}>
              <Download size={16} color="#36435C" fill="#C1C9D1" />
              {t('LOG_EXPORT')}
            </OutlineButton>
          </Tooltip>
        </ToolbarGroup>
      </Toolbar>
      <LogPanel>
        {hasLogs ? (
          <LogBody>
            <LogSearchBar
              keyword={keyword}
              matchCount={matches.length}
              filterActive={filterActive}
              disabled={lines.length === 0}
              onKeywordChange={setKeyword}
              onToggleFilter={() => setFilterActive(current => !current)}
              onPrev={() => setCurrentIndex(index => wrapMatchIndex(index, matches.length, -1))}
              onNext={() => setCurrentIndex(index => wrapMatchIndex(index, matches.length, 1))}
            />
            <LogLines
              lines={lines}
              lineNumbers={lineNumbers}
              matches={matches}
              currentIndex={currentIndex}
            />
            {showLoading && <Loading className="page-loading" />}
          </LogBody>
        ) : (
          <EmptyWrapper
            title={t('NO_DATA')}
            image={<img src="/assets/empty-card.svg" />}
            imageStyle={{ width: '100%', background: 'none' }}
          />
        )}
      </LogPanel>
    </ContentCard>
  );
}

export default ContainerLog;
