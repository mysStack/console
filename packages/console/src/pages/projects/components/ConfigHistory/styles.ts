/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import styled from 'styled-components';
import { YamlHeader } from '../../../clusters/components/RevisionControl/styles';

export const HistoryMetadata = styled(YamlHeader)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px 40px;

  & > div {
    margin-right: 0;
    min-width: 0;
    overflow-wrap: anywhere;
  }
`;

export const ComparisonTable = styled.table`
  width: 100%;
  min-width: 640px;
  table-layout: fixed;
  border-collapse: collapse;
  color: #36435c;

  caption {
    padding: 0 0 12px;
    text-align: left;
    font-size: 14px;
    font-weight: 600;
  }

  th,
  td {
    padding: 12px 16px;
    border: 1px solid #e3e9ef;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  thead th {
    background: #eff4f9;
  }

  thead span {
    display: block;
    margin-top: 4px;
    color: #5f708a;
    font-weight: normal;
  }

  tbody th {
    font-weight: 500;
  }

  pre {
    margin: 0;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 12px;
    line-height: 1.8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  td[data-change='removed'] {
    background: #fdf1f4;
  }

  td[data-change='added'] {
    background: #e5f5ec;
  }

  td[data-empty='true'] {
    color: #5f708a;
  }
`;
