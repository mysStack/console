import { startApp } from 'wujie';

/**
 * Render the shared `consolev3` app again inside its existing sandbox.
 *
 * Wujie clears the ShadowRoot when an embed that does not use `alive` unmounts
 * (cluster and other V3-only routes still render `WujieReact` directly), but
 * the sandbox iframe, its loaded scripts and its stylesheets survive. Calling
 * `destroyApp` throws that away and pays for a full cold boot, which is what
 * left the next list blank for seconds. Activating the sandbox without `alive`
 * re-renders the template and the child root in the loaded iframe instead.
 *
 * The host element is parked in a detached container; the `alive` host that
 * renders right after the revive moves it into the visible slot.
 */
export async function reviveConsoleV3Instance(url: string): Promise<void> {
  try {
    await startApp({
      name: 'consolev3',
      url,
      sync: false,
      alive: false,
      el: document.createElement('div'),
    });
  } catch (error) {
    console.warn('[ConsoleV3] failed to render the shared app again', error);
  }
}
