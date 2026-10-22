import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';

const localeRoot = path.resolve(__dirname, '../../../../../../../locales');

const expected = {
  en: {
    CREATE_DEPLOYMENT: 'Create Deployment',
    CREATE_DEPLOYMENT_FAILED: 'Failed to create Deployment.',
    REPLICAS: 'Replicas',
  },
  es: {
    CREATE_DEPLOYMENT: 'Crear deployment',
    CREATE_DEPLOYMENT_FAILED: 'No se pudo crear el deployment.',
    REPLICAS: 'Réplicas',
  },
  tc: {
    CREATE_DEPLOYMENT: '建立部署',
    CREATE_DEPLOYMENT_FAILED: '建立部署失敗。',
    REPLICAS: '副本數量',
  },
  zh: {
    CREATE_DEPLOYMENT: '创建部署',
    CREATE_DEPLOYMENT_FAILED: '创建部署失败。',
    REPLICAS: '副本数量',
  },
};

test('Deployment 创建表单在所有内置语言中提供本地化标题和副本字段', () => {
  for (const [language, values] of Object.entries(expected)) {
    const locale = require(
      path.join(localeRoot, language, 'l10n-projects-applicationWorkloads-deployments-list.js'),
    );

    assert.equal(locale.CREATE_DEPLOYMENT, values.CREATE_DEPLOYMENT, language);
    assert.equal(locale.CREATE_DEPLOYMENT_FAILED, values.CREATE_DEPLOYMENT_FAILED, language);
    assert.equal(locale.REPLICAS, values.REPLICAS, language);
  }
});
