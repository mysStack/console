import type { ConsoleV3SandboxLike, ConsoleV3ShadowRootLike } from './metrics';
import { scheduleConsoleV3ListRouteSync } from './route';

/**
 * Wujie treats `sandbox.alive` as the owner's decision for the whole app, not
 * per host, and `activate` overwrites it with the options of the latest caller.
 * The V3-only pages of the bridge embed the shared app without `alive`, so on
 * their way out Wujie runs the child unmount hook and clears the ShadowRoot.
 * The project list then has nothing to activate. Restoring the flag keeps the
 * app mounted; its route is moved by the activating host.
 */
export const keepConsoleV3SandboxAlive = (sandbox?: ConsoleV3SandboxLike | null): boolean => {
  if (!sandbox) return false;
  sandbox.alive = true;
  return true;
};

/**
 * A non-alive activation appends a fresh `<html>` template and moves the live
 * head and body into it, leaving the previous `<html>` behind as an empty
 * shell. The shell still matches the app stylesheet, so it keeps a full
 * viewport of empty space above the app. Keep the template that owns the
 * canonical body and drop the shells.
 */
export const pruneConsoleV3Templates = (shadowRoot?: ConsoleV3ShadowRootLike | null): number => {
  const templates = shadowRoot?.children;
  if (!shadowRoot || !shadowRoot.body || !templates) return 0;

  let removed = 0;
  Array.from(templates).forEach(template => {
    if (template.tagName !== 'HTML' || template.contains(shadowRoot.body)) return;
    template.remove();
    removed += 1;
  });
  return removed;
};

/**
 * Wujie syncs the activating embed's URL into the child with
 * `history.replaceState`, which a child router never observes. A non-alive
 * embed survives that because Wujie unmounts and mounts the child around it;
 * a kept-alive app keeps its router state, so the host has to move the router
 * to the route the embed asked for.
 */
export const scheduleConsoleV3ActivationRoute = (
  sandbox?: ConsoleV3SandboxLike | null,
): boolean => {
  const appWindow = sandbox?.iframe?.contentWindow;
  if (!appWindow || !sandbox?.url) return false;

  scheduleConsoleV3ListRouteSync(appWindow, sandbox.url);
  return true;
};

const watchedShadowRoots = new WeakSet<object>();

/**
 * Apply the guards now and after every template change of this ShadowRoot.
 *
 * Returns whether a watcher was attached. A ShadowRoot is watched once; a
 * rebuilt sandbox brings a new ShadowRoot and gets its own watcher.
 */
export const watchConsoleV3Sandbox = (
  sandbox?: ConsoleV3SandboxLike | null,
  MutationObserverCtor: typeof MutationObserver | undefined = typeof window === 'undefined'
    ? undefined
    : window.MutationObserver,
): boolean => {
  const shadowRoot = sandbox?.shadowRoot;
  if (!sandbox || !shadowRoot || !MutationObserverCtor || watchedShadowRoots.has(shadowRoot)) {
    return false;
  }

  watchedShadowRoots.add(shadowRoot);
  const synchronize = (records?: MutationRecord[]) => {
    keepConsoleV3SandboxAlive(sandbox);
    pruneConsoleV3Templates(shadowRoot);
    // Only an appended template marks another caller's non-alive activation;
    // pruning our own shell must not re-trigger the route sync.
    if (records?.some(record => record.addedNodes.length > 0)) {
      scheduleConsoleV3ActivationRoute(sandbox);
    }
  };
  synchronize();
  new MutationObserverCtor(synchronize).observe(shadowRoot as unknown as Node, {
    childList: true,
  });
  return true;
};
