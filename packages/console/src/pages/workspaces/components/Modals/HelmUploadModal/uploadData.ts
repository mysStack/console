export type ValidatedHelmInfo = {
  base64Str?: string;
  appName?: string;
  versionName?: string;
  name?: string;
  icon?: string;
};

export function getHelmUploadData(type: string, info: ValidatedHelmInfo) {
  if (type === 'ADD_VERSION') {
    return {
      package: info.base64Str,
      name: info.versionName || info.name,
      ...(info.icon ? { icon: info.icon } : {}),
    };
  }

  return {
    appType: 'helm',
    base64Str: info.base64Str,
    appName: info.appName,
    versionName: info.versionName || info.name,
    ...(info.icon ? { icon: info.icon } : {}),
  };
}
