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
    padding: 0 0 10px;
    text-align: left;
    font-size: 14px;
    font-weight: 600;
  }

  th,
  td {
    padding: 10px 14px;
    border: 1px solid #e3e9ef;
    text-align: left;
    vertical-align: top;
    overflow-wrap: anywhere;
  }

  thead th {
    background: #eff4f9;
    color: #36435c;
    font-size: 12px;
    font-weight: 600;
  }

  thead span {
    display: block;
    margin-top: 4px;
    color: #5f708a;
    font-weight: normal;
  }

  tbody th {
    font-weight: 500;
    white-space: nowrap;
  }

  tbody tr:hover {
    background: #f8fafd;
  }

  pre,
  .value {
    margin: 0;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 12px;
    line-height: 1.8;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .value {
    display: block;
    color: #36435c;
  }

  td[data-change='removed'] {
    background: #fdf1f4;
    color: #b42344;
  }

  td[data-change='added'] {
    background: #e5f5ec;
    color: #247a52;
  }

  td[data-empty='true'] {
    color: #5f708a;
  }
`;

export const ChangeLabel = styled.span<{ change: 'added' | 'removed' | 'modified' | 'unchanged' }>`
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  color: ${props =>
    ({ added: '#247a52', removed: '#b42344', modified: '#8b5a00', unchanged: '#5f708a' })[
      props.change
    ]};
  background: ${props =>
    ({ added: '#e5f5ec', removed: '#fdf1f4', modified: '#fff4d6', unchanged: '#eff4f9' })[
      props.change
    ]};
`;

export const Value = styled.span`
  display: block;
  min-height: 22px;
  color: inherit;
  font-family: 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  line-height: 1.8;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;
