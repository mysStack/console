/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const getV3DistUpstream = () => {
  const raw = process.env.V3DIST_UPSTREAM || process.env.KS_CONSOLE_EMBED_URL || '';
  return String(raw).trim().replace(/\/+$/, '');
};

const readLocalV3Json = name => {
  const file = path.resolve(process.cwd(), 'dist', 'v3dist', name);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const fetchV3Json = url =>
  new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { timeout: 5000 }, res => {
      if (res.statusCode !== 200) {
        res.resume();
        reject(new Error(`v3dist ${res.statusCode} ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch (error) {
          reject(error);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`v3dist timeout ${url}`));
    });
  });

const loadV3DistJson = async name => {
  const upstream = getV3DistUpstream();
  if (upstream) {
    return fetchV3Json(`${upstream}/dist/v3dist/${name}`);
  }
  return readLocalV3Json(name);
};

const applyV3DistProxy = (app, proxyMw) => {
  const upstream = getV3DistUpstream();
  if (!upstream) {
    return false;
  }
  const proxy = proxyMw || require('../middlewares/proxy');
  app.use(
    proxy('/dist/v3dist/(.*)', {
      target: upstream,
      changeOrigin: true,
    }),
  );
  return true;
};

module.exports = {
  getV3DistUpstream,
  loadV3DistJson,
  applyV3DistProxy,
};
