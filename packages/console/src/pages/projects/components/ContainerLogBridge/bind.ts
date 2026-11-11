import { parseV3ContainerLogClick } from './parse';

export type V3ContainerLogRoot = Document | ShadowRoot;

/**
 * Workspace V3 lives in the Wujie shadow, an iframe document, or both.
 * Clicks must be captured on every root: host-document listeners see a
 * retargeted `wujie-app` instead of the log icon.
 */
export function collectV3ContainerLogRoots(
  hostDocument: Document,
  appWindow?: Window,
  shadow?: ShadowRoot | null,
): V3ContainerLogRoot[] {
  const roots: V3ContainerLogRoot[] = [];
  const add = (root: V3ContainerLogRoot | null | undefined) => {
    if (root && !roots.includes(root)) {
      roots.push(root);
    }
  };
  const addIframes = (node: ParentNode | Document | ShadowRoot | null | undefined) => {
    if (!node || typeof (node as ParentNode).querySelectorAll !== 'function') {
      return;
    }
    (node as ParentNode).querySelectorAll('iframe').forEach(frame => {
      try {
        add((frame as HTMLIFrameElement).contentDocument);
      } catch {
        // Cross-origin frames are not interceptable.
      }
    });
  };
  add(hostDocument);
  add(appWindow?.document);
  add(shadow ?? undefined);
  addIframes(hostDocument);
  addIframes(shadow ?? undefined);
  return roots;
}

export function bindV3ContainerLogClick(
  roots: V3ContainerLogRoot[],
  onHit: (target: { podName: string; containerName: string }) => void,
): () => void {
  const handleClick = (event: Event) => {
    const parsed = parseV3ContainerLogClick(event.target);
    if (!parsed) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
    onHit(parsed);
  };
  roots.forEach(root => {
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('click', handleClick, true);
    }
  });
  return () => {
    roots.forEach(root => {
      if (typeof root.removeEventListener === 'function') {
        root.removeEventListener('click', handleClick, true);
      }
    });
  };
}
