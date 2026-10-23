import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';

const localeRoot = path.resolve(__dirname, '../../../../../../../locales');

const expected = {
  en: {
    CREATE_DEPLOYMENT: 'Create Deployment',
    CREATE_DEPLOYMENT_FAILED: 'Failed to create Deployment.',
    REPLICAS: 'Replicas',
    STARTUP_COMMAND: 'Start Command',
    COMMAND: 'Command',
    PARAMETERS: 'Parameters',
    PVC_TEMPLATE_NAME: 'PVC template name',
    PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL: 'Persistent Volume Claim Templates',
    WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE: 'Add PVC template',
  },
  es: {
    CREATE_DEPLOYMENT: 'Crear deployment',
    CREATE_DEPLOYMENT_FAILED: 'No se pudo crear el deployment.',
    REPLICAS: 'Réplicas',
    STARTUP_COMMAND: 'Comando de inicio',
    COMMAND: 'Comando',
    PARAMETERS: 'Parámetros',
    PVC_TEMPLATE_NAME: 'Nombre de plantilla PVC',
    PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL: 'Plantillas de Persistent Volume Claim',
    WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE: 'Agregar plantilla PVC',
  },
  tc: {
    CREATE_DEPLOYMENT: '建立部署',
    CREATE_DEPLOYMENT_FAILED: '建立部署失敗。',
    REPLICAS: '副本數量',
    STARTUP_COMMAND: '啟動命令',
    COMMAND: '命令',
    PARAMETERS: '參數',
    PVC_TEMPLATE_NAME: 'PVC 模板名稱',
    PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL: '持久卷聲明模板',
    WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE: '新增持久卷聲明模板',
  },
  zh: {
    CREATE_DEPLOYMENT: '创建部署',
    CREATE_DEPLOYMENT_FAILED: '创建部署失败。',
    REPLICAS: '副本数量',
    STARTUP_COMMAND: '启动命令',
    COMMAND: '命令',
    PARAMETERS: '参数',
    PVC_TEMPLATE_NAME: 'PVC 模板名称',
    PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL: '持久卷声明模板',
    WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE: '添加持久卷声明模板',
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
    assert.equal(locale.STARTUP_COMMAND, values.STARTUP_COMMAND, language);
    assert.equal(locale.COMMAND, values.COMMAND, language);
    assert.equal(locale.PARAMETERS, values.PARAMETERS, language);
    assert.equal(locale.PVC_TEMPLATE_NAME, values.PVC_TEMPLATE_NAME, language);
    assert.equal(
      locale.PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL,
      values.PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL,
      language,
    );
    assert.equal(
      locale.WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE,
      values.WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE,
      language,
    );
  }
});
