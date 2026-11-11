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

type DomNode = {
  className?: unknown;
  parentElement?: DomNode | null;
  querySelector?: (selector: string) => DomNode | null;
  getAttribute?: (name: string) => string | null;
} | null;

function classNameOf(node: DomNode) {
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

function glyphHref(node: DomNode): string {
  if (!node?.getAttribute) {
    return '';
  }
  return node.getAttribute('href') || node.getAttribute('xlink:href') || '';
}

function isLogGlyphHref(href: string): boolean {
  return href === '#icon-log' || href.endsWith('#icon-log');
}

function isTerminalNode(node: DomNode): boolean {
  const className = classNameOf(node);
  if (/\bqicon-terminal\b/.test(className) || /\bicon-terminal\b/.test(className)) {
    return true;
  }
  if (
    /\bicon-clickable\b/.test(className) &&
    Boolean(node?.querySelector?.('.qicon-terminal')) &&
    !node?.querySelector?.('.qicon-log')
  ) {
    return true;
  }
  const href = glyphHref(node) || glyphHref(node?.querySelector?.('use') ?? null);
  return href === '#icon-terminal' || href.endsWith('#icon-terminal');
}

function isLogIconNode(node: DomNode): boolean {
  if (!node || isTerminalNode(node)) {
    return false;
  }
  const className = classNameOf(node);
  if (isV3ContainerLogIcon(className) || isLogGlyphHref(glyphHref(node))) {
    return true;
  }
  if (
    /\bqicon\b/.test(className) &&
    isLogGlyphHref(glyphHref(node.querySelector?.('use') ?? null))
  ) {
    return true;
  }
  if (!/\bicon-clickable\b/.test(className)) {
    return false;
  }
  if (node.querySelector?.('.qicon-log')) {
    return true;
  }
  return isLogGlyphHref(glyphHref(node.querySelector?.('use') ?? null));
}

function parseContainerTarget(href?: string | null): {
  podName: string;
  containerName: string;
} | null {
  const podName = parsePodNameFromHref(href);
  const containerName = parseContainerNameFromHref(href);
  if (podName && containerName) {
    return { podName, containerName };
  }
  return null;
}

function findContainerTarget(node: DomNode): {
  podName: string;
  containerName: string;
} | null {
  let scope = node;
  for (let hop = 0; hop < 12 && scope; hop += 1) {
    const own = parseContainerTarget(scope.getAttribute?.('href'));
    if (own) {
      return own;
    }
    const nested = parseContainerTarget(
      scope.querySelector?.('a[href*="/containers/"]')?.getAttribute?.('href'),
    );
    if (nested) {
      return nested;
    }
    scope = scope.parentElement ?? null;
  }
  return null;
}

export function parseV3ContainerLogClick(target: EventTarget | null): {
  podName: string;
  containerName: string;
} | null {
  let node = target as DomNode;

  for (let index = 0; index < 12 && node; index += 1) {
    if (isTerminalNode(node)) {
      return null;
    }
    if (isLogIconNode(node)) {
      return findContainerTarget(node);
    }
    node = node.parentElement ?? null;
  }

  return null;
}
