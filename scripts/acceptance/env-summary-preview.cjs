/**
 * Local browser fixture for the REAL read-only React components, not a mockup.
 * Only shared store responses / the native card shell are fixtures. No cluster
 * writes, credentials or generated dist files. NOT a substitute for 131 E2E.
 * Run: node scripts/acceptance/env-summary-preview.cjs
 */
const http = require('node:http');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '../..');
const component = path.join(
  root,
  'packages/console/src/pages/projects/components/ConfigReference/ConfigReferenceSummary.tsx',
);
const locale = require('../../locales/zh/l10n-projects-components-configReference.js');
const entry = `
import React from 'react';
import ReactDOM from 'react-dom';
import Summary from ${JSON.stringify(component)};
const locale = ${JSON.stringify(locale)};
Object.assign(locale, {ENVIRONMENT_VARIABLE_PL: '环境变量', FROM_CONFIGMAP: '来自配置字典', FROM_SECRET: '来自保密字典'});
window.t = (key, params = {}) => Object.entries(params).reduce((s, [k, v]) => s.replaceAll('{'+k+'}', String(v)), locale[key] || key);
const fixture = {spec: {template: {spec: {containers: [
  {name:'main', env:[{name:'DB',value:'111111'}], envFrom:[{secretRef:{name:'test-secret'}},{configMapRef:{name:'test-config'}}]},
  {name:'sidecar',envFrom:[{configMapRef:{name:'sidecar-config'}}]},
  {name:'env-only',env:[{name:'ONLY',value:'yes'}]},
  {name:'empty'}
]}}}};
window.fixtureWorkload = fixture;
fixture.spec.template.spec.containers.forEach((container, index) => {
  const card = document.createElement('article'); card.dataset.container = container.name;
  const title = document.createElement('button'); title.textContent = '容器：'+container.name; title.setAttribute('aria-expanded','true');
  const body = document.createElement('div'); body.className = 'body';
  title.onclick = () => {body.hidden = !body.hidden; title.setAttribute('aria-expanded',String(!body.hidden));};
  const headingHost = document.createElement('div'); body.appendChild(headingHost);
  (container.env || []).forEach(env => {
    const row = document.createElement('div'); row.className = 'native-row'; row.dataset.test = 'native-env-row';
    const name = document.createElement('span'); name.textContent = env.name;
    const value = document.createElement('span'); value.textContent = env.value;
    row.append(name,value); body.appendChild(row);
  });
  const host = document.createElement('div'); body.appendChild(host); card.append(title,body); document.querySelector('main').appendChild(card);
  ReactDOM.render(<Summary cluster='fixture' namespace='fixture' name='fixture' module='deployments' containerName={container.name} containerIndex={index} containerCount={4} refreshKey={0} variant='envTab' environmentHeadingHost={headingHost}/>,host);
});
`;

const storeFixture = `
export const workloadStore = () => ({useGetDetail: () => ({data:window.fixtureWorkload,isLoading:false})});
export const configMapStore = {fetchDetail: async ({name}) => ({data: name === 'sidecar-config' ? {SIDECAR_ONLY:'yes'} : {
  RABBITMQ_CONCURRENT_CONSUMERS:'',
  RABBITMQ_MAX_CONCURRENT_CONSUMERS_FOR_PRIORITY_QUEUE_WITH_EXTRA_LONG_IDENTIFIER:'32',
  ENDPOINT:'http://example.test/'+ 'long-path/'.repeat(18)
}})};
export const secretStore = {getDetailUrl: () => '/fixture-secret'};
export const request = {get:async () => ({data:{DB_PASSWORD:'',MQTT_PASSWORD:'',RABBITMQ_PASSWORD:'',REDIS_PASSWORD:''}})};
`;

async function main() {
  const built = await esbuild.build({
    stdin: { contents: entry, loader: 'tsx', resolveDir: root },
    bundle: true,
    write: false,
    define: { 'process.env.NODE_ENV': '"development"' },
    plugins: [
      {
        name: 'fixture-shared-store',
        setup(build) {
          build.onResolve({ filter: /^@ks-console\/shared$/ }, () => ({
            path: 'shared',
            namespace: 'fixture',
          }));
          build.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({
            contents: storeFixture,
            loader: 'js',
          }));
        },
      },
    ],
  });
  const html = `<!doctype html><html lang="zh"><meta charset="utf-8"><title>正式组件布局测试（本地夹具）</title>
    <style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eff4f9;font:12px/20px Arial,sans-serif;color:#36435c}main{max-width:1150px;margin:auto}article{background:white;padding:20px;margin:0 0 20px}article>button{border:0;background:none;font:600 14px/20px Arial;cursor:pointer}.body{padding:20px 0 0}.body[hidden]{display:none}.native-row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:24px;min-height:44px;padding:11px 32px;border:1px solid #c8d3e1;border-radius:24px;background:#eff4f9}</style>
    <main></main><script src="/bundle.js"></script></html>`;
  http
    .createServer((req, res) => {
      res.setHeader(
        'Content-Type',
        req.url === '/bundle.js' ? 'application/javascript' : 'text/html; charset=utf-8',
      );
      res.end(req.url === '/bundle.js' ? built.outputFiles[0].text : html);
    })
    .listen(0, '127.0.0.1', function () {
      console.log('LOCAL COMPONENT FIXTURE http://127.0.0.1:' + this.address().port);
    });
}
main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
