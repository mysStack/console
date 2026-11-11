export interface LogMatch {
  lineNumber: number;
  start: number;
  end: number;
}

export const MAX_LOG_MATCHES = 500;
export const MAX_HIGHLIGHTS_PER_LINE = 30;

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
  for (let index = 0; index < lines.length; index += 1) {
    const haystack = lines[index].toLowerCase();
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
      if (matches.length >= MAX_LOG_MATCHES) {
        return matches;
      }
      from = start + Math.max(lower.length, 1);
    }
  }
  return matches;
}

export function groupMatchesByLine(
  matches: LogMatch[],
): Map<number, Array<LogMatch & { index: number }>> {
  const grouped = new Map<number, Array<LogMatch & { index: number }>>();
  matches.forEach((item, index) => {
    const next = { ...item, index };
    const row = grouped.get(item.lineNumber);
    if (!row) {
      grouped.set(item.lineNumber, [next]);
      return;
    }
    if (row.length < MAX_HIGHLIGHTS_PER_LINE) {
      row.push(next);
    }
  });
  return grouped;
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
