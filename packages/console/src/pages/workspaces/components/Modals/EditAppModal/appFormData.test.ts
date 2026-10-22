import assert from 'node:assert/strict';
import test from 'node:test';

import { AppDetail } from '@ks-console/shared';

import { getAppEditInitialValues, toAppPatchData } from './appFormData';

const detail = {
  metadata: {
    name: 'stakater-configmap',
    labels: {
      'application.kubesphere.io/app-category-name': 'kubesphere-app-uncategorized',
      'kubesphere.io/workspace': 'system-workspace',
    },
    annotations: {
      'kubesphere.io/description': 'ConfigMap chart that runs on kubernetes',
      'kubesphere.io/alias-name': 'ConfigMap',
    },
  },
  spec: {
    appHome: 'https://github.com/stakater-charts/configmap',
    abstraction: 'ConfigMap chart that runs on kubernetes',
    icon: '',
    attachments: ['image-data'],
  },
} as unknown as AppDetail;

test('maps the V2 application object to edit form values', () => {
  assert.deepEqual(getAppEditInitialValues(detail), {
    name: 'ConfigMap',
    description: 'ConfigMap chart that runs on kubernetes',
    abstraction: 'ConfigMap chart that runs on kubernetes',
    home: 'https://github.com/stakater-charts/configmap',
    icon: '',
    category_id: 'kubesphere-app-uncategorized',
    workspace: 'system-workspace',
  });
});

test('maps edited fields to the V2 application patch contract', () => {
  assert.deepEqual(
    toAppPatchData(
      {
        name: 'ConfigMap Updated',
        description: 'Updated description',
        category_id: 'category-a',
      },
      detail,
    ),
    {
      aliasName: 'ConfigMap Updated',
      description: 'Updated description',
      abstraction: 'ConfigMap chart that runs on kubernetes',
      appHome: 'https://github.com/stakater-charts/configmap',
      icon: '',
      categoryName: 'category-a',
      attachments: ['image-data'],
    },
  );
});
