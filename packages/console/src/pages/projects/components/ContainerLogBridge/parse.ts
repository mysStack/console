export function parsePodNameFromHref(href?: string | null): string | undefined {
  const matched = String(href || '').match(/\/pods\/([^/?#]+)(?:\/|$)/);
  return matched?.[1];
}

export function parseContainerNameFromHref(href?: string | null): string | undefined {
  const matched = String(href || '').match(/\/containers\/([^/?#]+)(?:\/|$)/);
  return matched?.[1];
}

export function isV3ContainerLogIcon(className: string): boolean {
  if (/\bqicon-terminal\b/.test(className) || /\bicon-terminal\b/.test(className)) {
    return false;
  }
  return /\bqicon-log\b/.test(className) || /\bicon-log\b/.test(className);
}

function classNameOf(
  node: { className?: unknown; getAttribute?: (name: string) => string | null } | null,
) {
  if (!node) {
    return '';
  }
  const value = node.className;
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof (value as { baseVal?: string }).baseVal === 'string') {
    return (value as { baseVal: string }).baseVal;
  }
  return String(node.getAttribute?.('class') || '');
}

export function parseV3ContainerLogClick(target: EventTarget | null): {
  podName: string;
  containerName: string;
} | null {
  let node = target as {
    className?: unknown;
    parentElement?: any;
    querySelector?: (selector: string) => { getAttribute?: (name: string) => string | null } | null;
    getAttribute?: (name: string) => string | null;
  } | null;

  for (let index = 0; index < 8 && node; index += 1) {
    const className = classNameOf(node);
    const terminal =
      /\bqicon-terminal\b/.test(className) ||
      (/\bicon-clickable\b/.test(className) &&
        Boolean(node.querySelector?.('.qicon-terminal')) &&
        !node.querySelector?.('.qicon-log'));
    if (terminal) {
      return null;
    }

    const logHit =
      isV3ContainerLogIcon(className) ||
      (/\bicon-clickable\b/.test(className) && Boolean(node.querySelector?.('.qicon-log')));
    if (!logHit) {
      node = node.parentElement;
      continue;
    }

    const scope = node.parentElement || node;
    const link = scope.querySelector?.('a[href*="/containers/"]');
    const href = link?.getAttribute?.('href') || '';
    const podName = parsePodNameFromHref(href);
    const containerName = parseContainerNameFromHref(href);
    if (podName && containerName) {
      return { podName, containerName };
    }
    return null;
  }

  return null;
}
