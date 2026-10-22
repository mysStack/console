export const getDataDescription = (value: unknown, module?: string) =>
  module === 'configmaps' ? String(value || '-') : value ? '******' : '-';

export const getEditableDataValue = (value: string, module?: string) =>
  module === 'configmaps' ? value || '' : '';

export const getSubmittedDataValue = (originalValue: string, value: string, module?: string) => {
  if (module === 'configmaps') {
    return value;
  }

  return value || originalValue || '';
};
