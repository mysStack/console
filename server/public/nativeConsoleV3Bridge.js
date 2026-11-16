(function () {
  const bridge = window.parent.__consoleV3NativeBridge;
  if (!bridge || !bridge.ownsFrame(window)) return;
  const childDocument = window.document;
  bridge.attach(window, childDocument);
  const bus = new Proxy(bridge.bus, {
    get(target, key, receiver) {
      if (key === '$emit')
        return function (event, ...args) {
          if (event === 'loadCompleted' && !bridge.markReady(window, childDocument))
            return receiver;
          if (event === 'subRouteChange' && !bridge.routeAccepted(args[1])) return receiver;
          target.$emit(event, ...args);
          return receiver;
        };
      if (key === '$on')
        return function (event, handler) {
          if (!bridge.listeners.some(([name, listener]) => name === event && listener === handler))
            bridge.listeners.push([event, handler]);
          target.$on(event, handler);
          return receiver;
        };
      if (key === '$off')
        return function (event, handler) {
          const index = bridge.listeners.findIndex(
            ([name, listener]) => name === event && listener === handler,
          );
          if (index !== -1) bridge.listeners.splice(index, 1);
          target.$off(event, handler);
          return receiver;
        };
      if (key === '$clear')
        return function () {
          for (const [event, handler] of bridge.listeners.splice(0)) target.$off(event, handler);
          return receiver;
        };
      const value = target[key];
      return typeof value === 'function' ? value.bind(receiver) : value;
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
