/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

import styled from 'styled-components';
import { Card, Empty } from '@kubed/components';

export const ContentCard = styled(Card)`
  height: 100%;
  min-height: 480px;
  box-shadow: none;

  & > div,
  .kubed-card-body {
    height: 100%;
    min-height: 440px;
    display: flex;
    flex-direction: column;
    padding: 20px;
  }
`;

export const Toolbar = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  margin-bottom: 12px;
`;

export const ToolbarGroup = styled.div`
  display: flex;
  flex: none;
  align-items: center;
  gap: 12px;
`;

export const OutlineButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 6px 12px;
  border: 1px solid ${({ $active }) => ($active ? '#242e42' : '#ccd3db')};
  border-radius: 4px;
  color: ${({ $active }) => ($active ? '#fff' : '#36435c')};
  background-color: ${({ $active }) => ($active ? '#242e42' : '#fff')};
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;

  &:hover,
  &:focus {
    border-color: ${({ $active }) => ($active ? '#242e42' : '#ccd3db')};
    color: ${({ $active }) => ($active ? '#fff' : '#36435c')};
    background-color: ${({ $active }) => ($active ? '#242e42' : '#f0f4f9')};
  }

  .kubed-icon {
    flex: none;
    margin-right: 6px;
  }
`;

export const TimeSelectorWrap = styled.div<{ $zIndex: number }>`
  position: relative;
  z-index: ${({ $zIndex }) => $zIndex};
`;

export const TimeMask = styled.div<{ $open?: boolean; $zIndex: number }>`
  display: ${({ $open }) => ($open ? 'block' : 'none')};
  position: fixed;
  inset: 0;
  z-index: ${({ $zIndex }) => $zIndex};
`;

export const TimeTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  min-width: 200px;
  height: 32px;
  padding: 6px 12px;
  border: 1px solid #ccd3db;
  border-radius: 4px;
  color: #36435c;
  background: #fff;
  box-shadow: none;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  cursor: pointer;

  .relative-time-selector__label {
    flex: 1;
    margin: 0 8px;
    text-align: left;
  }
`;

export const TimeDropdown = styled.div<{ $zIndex: number }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: ${({ $zIndex }) => $zIndex + 1};
  width: 280px;
  padding: 12px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 4px 8px rgba(36, 46, 66, 0.16);
`;

export const TimeSectionTitle = styled.div`
  margin-bottom: 8px;
  color: #79879c;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
`;

export const TimeOptionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 220px;
  overflow: auto;
`;

export const TimeOption = styled.button<{ $selected?: boolean }>`
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 4px;
  color: #36435c;
  background: ${({ $selected }) => ($selected ? '#eff4f9' : 'transparent')};
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  text-align: left;
  cursor: pointer;

  &:hover {
    background: #eff4f9;
  }
`;

export const TimeDivider = styled.div`
  height: 1px;
  margin: 12px 0;
  background: #ccd3db;
`;

export const CustomTimeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CustomTimeInput = styled.input`
  width: 72px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #ccd3db;
  border-radius: 4px;
  color: #36435c;
  font-size: 12px;
`;

export const UnitTrigger = styled.button`
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  border: 1px solid #ccd3db;
  border-radius: 4px;
  background: #fff;
  color: #36435c;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
`;

export const UnitMenu = styled.div`
  position: absolute;
  z-index: 2;
  margin-top: 4px;
  padding: 4px;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 4px 8px rgba(36, 46, 66, 0.16);
`;

export const OkButton = styled.button`
  height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  color: #fff;
  background: #242e42;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

export const LogPanel = styled.div`
  position: relative;
  flex: 1;
  min-height: 360px;
  overflow: hidden;
  border-radius: 4px;
  background-color: #242e42;
`;

export const LogBody = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 300px;
  overflow: hidden;

  .page-loading {
    position: absolute;
    top: 52px;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;
    pointer-events: none;
  }
`;

export const SearchBarWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  height: 52px;
  padding: 10px 12px;
  border: 1px solid #36435c;
  background-color: #242e42;
`;

export const MatchCount = styled.span`
  display: inline-flex;
  flex: none;
  align-items: center;
  min-width: 60px;
  height: 20px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 20px;
  white-space: nowrap;
`;

export const SearchInput = styled.input`
  flex: 1;
  min-width: 0;
  height: 32px;
  margin: 0;
  padding: 6px 12px;
  border: 0;
  border-radius: 4px;
  color: #fff;
  background-color: #36435c;
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  outline: none;

  &:focus {
    box-shadow: none;
  }

  &::placeholder {
    color: #79879c;
  }

  &:disabled {
    opacity: 0.6;
  }
`;

export const IconButton = styled.button<{ $active?: boolean }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: #fff;
  background-color: ${({ $active }) => ($active ? '#45536c' : '#36435c')};
  cursor: pointer;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover:not(:disabled) {
    background-color: #45536c;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

export const LogList = styled.div`
  box-sizing: border-box;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-bottom: 12px;
  background-color: #242e42;
  color: #b7c4d1;
  font-family: Monaco, Menlo, Consolas, 'Courier New', monospace;
  font-size: 12px;
  font-weight: 700;
  line-height: 24px;
  scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 100px;
    background: rgba(255, 255, 255, 0.3);
  }
`;

export const LogLine = styled.div`
  display: flex;
  min-width: max-content;
  min-height: 24px;
  color: #b7c4d1;
  white-space: pre;

  &:hover,
  &.is-current {
    background-color: #36435c;
  }
`;

export const LogNumber = styled.span`
  box-sizing: border-box;
  flex: 0 0 56px;
  padding: 0 12px;
  color: #79879c;
  font-family: 'Roboto Mono', Monaco, Menlo, Consolas, 'Courier New', monospace;
  font-weight: 700;
  line-height: 24px;
  text-align: right;
`;

export const LogContent = styled.span`
  box-sizing: border-box;
  display: block;
  min-width: calc(100% - 56px);
  padding: 0 12px;
  color: #b7c4d1;
  font-weight: 700;
  line-height: 24px;
  white-space: pre;

  .log-search-match {
    border-radius: 2px;
    background-color: #ef9a4a;
    color: #242e42;
  }

  .log-highlight-current {
    border-radius: 2px;
    background-color: #fffd55;
    color: #242e42;
  }
`;

export const EmptyWrapper = styled(Empty)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  padding: 40px 0;
  position: absolute;

  .empty-title {
    margin-top: 30px;
  }
`;
