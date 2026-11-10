export interface LogMatch {
  lineNumber: number;
  start: number;
  end: number;
}

export function splitLogLines(log: string): string[] {
  const normalized = (log ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  if (!normalized) {
    return [];
  }
  const lines = normalized.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

export function findLogMatches(lines: string[], keyword: string): LogMatch[] {
  const needle = keyword.trim();
  if (!needle) {
    return [];
  }
  const lower = needle.toLowerCase();
  const matches: LogMatch[] = [];
  lines.forEach((text, index) => {
    const haystack = text.toLowerCase();
    let from = 0;
    while (from <= haystack.length - lower.length) {
      const start = haystack.indexOf(lower, from);
      if (start < 0) {
        break;
      }
      matches.push({
        lineNumber: index + 1,
        start,
        end: start + needle.length,
      });
      from = start + Math.max(lower.length, 1);
    }
  });
  return matches;
}

export function visibleLineNumbers(
  lineCount: number,
  matches: LogMatch[],
  filterActive: boolean,
): number[] {
  if (!filterActive || matches.length === 0) {
    return Array.from({ length: lineCount }, (_, index) => index + 1);
  }
  return [...new Set(matches.map(item => item.lineNumber))];
}

export function wrapMatchIndex(index: number, total: number, step: number): number {
  if (total <= 0) {
    return 0;
  }
  return (index + step + total) % total;
}
