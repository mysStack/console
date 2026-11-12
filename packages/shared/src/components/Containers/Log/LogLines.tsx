import React, { useEffect, useMemo, useRef } from 'react';
import { LogMatch, groupMatchesByLine } from './match';
import { LogContent, LogLine, LogList, LogNumber } from './styles';

interface Props {
  lines: string[];
  lineNumbers: number[];
  matches: LogMatch[];
  currentIndex: number;
}

function renderLineContent(
  text: string,
  lineMatches: Array<LogMatch & { index: number }>,
  currentIndex: number,
) {
  if (lineMatches.length === 0) {
    return text;
  }

  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  lineMatches.forEach(item => {
    if (item.start > cursor) {
      nodes.push(<span key={`t-${cursor}`}>{text.slice(cursor, item.start)}</span>);
    }
    nodes.push(
      <span
        key={`m-${item.index}`}
        className={item.index === currentIndex ? 'log-highlight-current' : 'log-search-match'}
      >
        {text.slice(item.start, item.end)}
      </span>,
    );
    cursor = item.end;
  });
  if (cursor < text.length) {
    nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  }
  return nodes;
}

const LogLineRow = React.memo(function LogLineRow({
  text,
  lineNumber,
  lineMatches,
  currentIndex,
  isCurrent,
}: {
  text: string;
  lineNumber: number;
  lineMatches: Array<LogMatch & { index: number }>;
  currentIndex: number;
  isCurrent: boolean;
}) {
  return (
    <LogLine data-line={lineNumber} className={isCurrent ? 'is-current' : undefined}>
      <LogNumber>{lineNumber}</LogNumber>
      <LogContent>{renderLineContent(text, lineMatches, currentIndex)}</LogContent>
    </LogLine>
  );
});

export function LogLines({ lines, lineNumbers, matches, currentIndex }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const currentLine = matches[currentIndex]?.lineNumber;
  const matchesByLine = useMemo(() => groupMatchesByLine(matches), [matches]);
  const emptyMatches = useMemo(() => [] as Array<LogMatch & { index: number }>, []);

  useEffect(() => {
    if (!currentLine || !listRef.current) {
      return;
    }
    const node = listRef.current.querySelector(`[data-line="${currentLine}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [currentLine, currentIndex]);

  return (
    <LogList ref={listRef} className="container-log-lazy-log" data-test="container-log-lines">
      {lineNumbers.map(lineNumber => (
        <LogLineRow
          key={lineNumber}
          text={lines[lineNumber - 1] ?? ''}
          lineNumber={lineNumber}
          lineMatches={matchesByLine.get(lineNumber) || emptyMatches}
          currentIndex={currentIndex}
          isCurrent={currentLine === lineNumber}
        />
      ))}
    </LogList>
  );
}
