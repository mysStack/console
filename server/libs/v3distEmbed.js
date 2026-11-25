/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const LEGACY_V3_ASSET = /^\/assets(\/[a-zA-Z-0-9_]+)+\.(svg|png|jpg|ico)$/;

const getV3DistUpstream = () => {
  const raw = process.env.V3DIST_UPSTREAM || process.env.KS_CONSOLE_EMBED_URL || '';
  return String(raw).trim().replace(/\/+$/, '');
};

/**
 * Old V4 pages request `/assets/*.svg`. After the split, Console has no local
 * v3dist tree, so the redirect must follow V3DIST_UPSTREAM instead of a disk
 * probe under dist/v3dist.
 */
const shouldRedirectLegacyV3Asset = (
  url,
  { distExists = false, localV3Exists = false, hasUpstream = false } = {},
) => {
  const pathname = String(url || '').split(/[?#]/)[0];
  if (!LEGACY_V3_ASSET.test(pathname)) {
    return false;
  }
  if (distExists) {
    return false;
  }
  return Boolean(localV3Exists || hasUpstream);
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
  shouldRedirectLegacyV3Asset,
};
