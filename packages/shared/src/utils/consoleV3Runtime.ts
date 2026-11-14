export type ConsoleV3Window = Window & { __WUJIE?: { id?: string } };

export function findConsoleV3Window(hostDocument: Document): ConsoleV3Window | undefined {
  for (const frame of Array.from(hostDocument.querySelectorAll('iframe'))) {
    try {
      const child = frame.contentWindow as ConsoleV3Window | null;
      if (child?.__WUJIE?.id === 'consolev3') return child;
    } catch {
      // Toolbox and cross-origin frames cannot own page actions.
    }
  }
  return undefined;
}

export function isConsoleV3PageMounted(hostDocument: Document): boolean {
  const app = hostDocument.querySelector('wujie-app[data-wujie-id="consolev3"]');
  return Boolean(app && !app.closest('[data-console-v3-actions-host]'));
}

export function createConsoleV3Runtime() {
  let readyWindow: Window | undefined;
  const listeners = new Set<() => void>();
  return {
    reset() {
      readyWindow = undefined;
    },
    markReady(child: Window) {
      readyWindow = child;
      for (const listener of [...listeners]) listener();
    },
    getReadyWindow(hostDocument: Document = document) {
      const current = findConsoleV3Window(hostDocument);
      return current && current === readyWindow ? current : undefined;
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const consoleV3Runtime = createConsoleV3Runtime();
