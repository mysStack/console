import { get } from 'lodash';

const getRevisionTemplate = (revision?: Record<string, any>) =>
  get(revision, 'spec.template') ||
  get(revision, '_originData.data.spec.template') ||
  get(revision, '_originData.spec.template');

export const getRollbackData = (
  module: string,
  selectedRevision?: Record<string, any>,
  currentAnnotations: Record<string, any> = {},
) => {
  const template = getRevisionTemplate(selectedRevision);

  if (!template) {
    return undefined;
  }

  if (module === 'deployments') {
    return [
      {
        op: 'replace',
        path: '/spec/template',
        value: template,
      },
      {
        op: 'replace',
        path: '/metadata/annotations',
        value: currentAnnotations,
      },
    ];
  }

  return {
    spec: {
      template: {
        $patch: 'replace',
        ...template,
      },
    },
  };
};
