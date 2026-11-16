/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

export function createExtensionSDKInstaller() {
  let initialize: (() => Promise<void>) | undefined;
  let registration: Promise<void> | undefined;

  return {
    configure(installer: () => Promise<void>) {
      initialize = installer;
    },
    install(): Promise<void> {
      if (!initialize) return Promise.reject(new Error('Extension SDK is not configured'));
      if (!registration) registration = Promise.resolve().then(initialize);
      return registration;
    },
  };
}

const extensionSDK = createExtensionSDKInstaller();
export const configureExtensionSDK = extensionSDK.configure;
export const installExtensionSDK = extensionSDK.install;
