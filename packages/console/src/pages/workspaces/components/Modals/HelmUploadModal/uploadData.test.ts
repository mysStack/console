import assert from 'node:assert/strict';
import test from 'node:test';

import { getHelmUploadData } from './uploadData';

test('builds version upload data from validated chart metadata', () => {
  assert.deepEqual(
    getHelmUploadData('ADD_VERSION', {
      base64Str: 'chart-bytes',
      appName: 'fixture-app',
      versionName: '0.2.0',
      icon: 'icon-data',
    }),
    {
      package: 'chart-bytes',
      name: '0.2.0',
      icon: 'icon-data',
    },
  );
});

test('builds create-app data with the base64 field expected by createApp', () => {
  assert.deepEqual(
    getHelmUploadData('CREATE_APP', {
      base64Str: 'chart-bytes',
      appName: 'fixture-app',
      versionName: '0.1.0',
      icon: 'icon-data',
    }),
    {
      appType: 'helm',
      base64Str: 'chart-bytes',
      appName: 'fixture-app',
      versionName: '0.1.0',
      icon: 'icon-data',
    },
  );
});
