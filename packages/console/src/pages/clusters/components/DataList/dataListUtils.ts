export const getDataDescription = (value: string, module?: string) =>
  module === 'configmaps' ? value || '-' : value ? '******' : '-';

export const getEditableDataValue = (value: string, module?: string) =>
  module === 'configmaps' ? value || '' : '';

export const getSubmittedDataValue = (originalValue: string, value: string, module?: string) => {
  if (module === 'configmaps') {
    return value;
  }

  return value || originalValue || '';
};
