import React, { useEffect, useMemo, useRef } from 'react';
import { LogMatch } from './match';
import { LogContent, LogLine, LogList, LogNumber } from './styles';

interface Props {
  lines: string[];
  lineNumbers: number[];
  matches: LogMatch[];
  currentIndex: number;
}

function renderLineContent(
  text: string,
  lineNumber: number,
  matches: LogMatch[],
  currentIndex: number,
) {
  const lineMatches = matches
    .map((item, index) => ({ ...item, index }))
    .filter(item => item.lineNumber === lineNumber);

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

export function LogLines({ lines, lineNumbers, matches, currentIndex }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const currentLine = matches[currentIndex]?.lineNumber;

  const currentKey = useMemo(() => `line-${currentLine || 0}`, [currentLine]);

  useEffect(() => {
    if (!currentLine || !listRef.current) {
      return;
    }
    const node = listRef.current.querySelector(`[data-line="${currentLine}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [currentKey, currentLine]);

  return (
    <LogList ref={listRef} className="container-log-lazy-log" data-test="container-log-lines">
      {lineNumbers.map(lineNumber => {
        const text = lines[lineNumber - 1] ?? '';
        return (
          <LogLine
            key={lineNumber}
            data-line={lineNumber}
            className={currentLine === lineNumber ? 'is-current' : undefined}
          >
            <LogNumber>{lineNumber}</LogNumber>
            <LogContent>{renderLineContent(text, lineNumber, matches, currentIndex)}</LogContent>
          </LogLine>
        );
      })}
    </LogList>
  );
}
