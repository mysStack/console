import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import path from 'node:path';

const localeRoot = path.resolve(__dirname, '../../../../../../../locales');
const createModalSource = readFileSync(path.resolve(__dirname, 'index.tsx'), 'utf8');

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
    WORKLOAD_VOLUME_CLAIM_INVALID:
      'Enter a valid PVC template name, capacity, access mode, and storage class.',
    WORKLOAD_VOLUME_CLAIM_DUPLICATE: 'PVC template names must be unique.',
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
    WORKLOAD_VOLUME_CLAIM_INVALID:
      'Introduzca valores válidos para el nombre, la capacidad, el acceso y la clase del PVC.',
    WORKLOAD_VOLUME_CLAIM_DUPLICATE: 'Los nombres de las plantillas PVC deben ser únicos.',
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
    WORKLOAD_VOLUME_CLAIM_INVALID: '請輸入有效的 PVC 模板名稱、容量、存取模式和儲存類別。',
    WORKLOAD_VOLUME_CLAIM_DUPLICATE: 'PVC 模板名稱不能重複。',
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
    WORKLOAD_VOLUME_CLAIM_INVALID: '请输入有效的 PVC 模板名称、容量、访问模式和存储类。',
    WORKLOAD_VOLUME_CLAIM_DUPLICATE: 'PVC 模板名称不能重复。',
  },
};

test('Workload 创建表单在所有内置语言中提供 PVC 标题、操作和校验文案', () => {
  assert.match(createModalSource, /label=\{t\('PERSISTENT_VOLUME_CLAIM_TEMPLATE_PL'\)\}/);
  assert.match(createModalSource, /addText=\{t\('WORKLOAD_ADD_VOLUME_CLAIM_TEMPLATE'\)\}/);
  assert.doesNotMatch(createModalSource, /t\('VOLUME_CLAIM_TEMPLATES'\)/);
  assert.doesNotMatch(createModalSource, /t\('ADD_VOLUME_CLAIM_TEMPLATE'\)/);

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
    assert.equal(
      locale.WORKLOAD_VOLUME_CLAIM_INVALID,
      values.WORKLOAD_VOLUME_CLAIM_INVALID,
      language,
    );
    assert.equal(
      locale.WORKLOAD_VOLUME_CLAIM_DUPLICATE,
      values.WORKLOAD_VOLUME_CLAIM_DUPLICATE,
      language,
    );
  }
});

test('环境引用的类型、字段、资源、divisor、optional 和校验提示均有四语言文案', () => {
  for (const language of ['en', 'es', 'tc', 'zh']) {
    const locale = require(
      path.join(localeRoot, language, 'l10n-projects-applicationWorkloads-deployments-list.js'),
    );
    for (const key of [
      'WORKLOAD_ENV_SOURCE',
      'WORKLOAD_ENV_FIELD_PATH',
      'WORKLOAD_ENV_RESOURCE',
      'WORKLOAD_ENV_DIVISOR',
      'WORKLOAD_REFERENCE_OPTIONAL',
      'WORKLOAD_ENV_REFERENCE_INVALID',
    ]) {
      assert.equal(typeof locale[key], 'string', `${language}: ${key}`);
      assert.notEqual(locale[key], key);
    }
  }
});

test('原生镜像搜索、分页和失败提示均有四语言文案', () => {
  for (const language of ['en', 'es', 'tc', 'zh']) {
    const locale = require(
      path.join(localeRoot, language, 'l10n-projects-applicationWorkloads-deployments-list.js'),
    );
    for (const key of [
      'WORKLOAD_IMAGE_SEARCH',
      'WORKLOAD_IMAGE_SEARCH_SUBMIT',
      'WORKLOAD_IMAGE_RESULTS',
      'WORKLOAD_IMAGE_TAG_PREVIOUS',
      'WORKLOAD_IMAGE_TAG_NEXT',
      'WORKLOAD_IMAGE_SEARCH_FAILED',
      'WORKLOAD_IMAGE_LOOKUP_FAILED',
      'WORKLOAD_IMAGE_REGISTRY_FAILED',
      'WORKLOAD_IMAGE_SIZE',
      'WORKLOAD_IMAGE_LAYERS',
      'WORKLOAD_IMAGE_RETRY',
    ]) {
      assert.equal(typeof locale[key], 'string', `${language}: ${key}`);
      assert.notEqual(locale[key], key);
    }
  }
});
