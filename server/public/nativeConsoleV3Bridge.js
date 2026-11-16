(function () {
  const bridge = window.parent.__consoleV3NativeBridge;
  if (!bridge || !bridge.ownsFrame(window)) return;
  const childDocument = window.document;
  bridge.attach(window, childDocument);
  const bus = new Proxy(bridge.bus, {
    get(target, key) {
      if (key === '$emit')
        return function (event, ...args) {
          if (event === 'loadCompleted' && !bridge.markReady(window, childDocument)) return;
          if (event === 'subRouteChange' && !bridge.routeAccepted(args[1])) return;
          return target.$emit(event, ...args);
        };
      if (key === '$on')
        return function (event, handler) {
          bridge.listeners.push([event, handler]);
          return target.$on(event, handler);
        };
      const value = target[key];
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  window.__POWERED_BY_WUJIE__ = true;
  window.$wujie = { bus, props: bridge.props };
  window.addEventListener(
    'DOMContentLoaded',
    () => {
      if (typeof window.__WUJIE_MOUNT !== 'function')
        throw new Error('Console resource mount hook unavailable');
      window.__WUJIE_MOUNT();
    },
    { once: true },
  );
  window.addEventListener('pagehide', () => bridge.resetDocument(window, childDocument), {
    once: true,
  });
})();
