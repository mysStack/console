const fs = require('fs');
const jwtDecode = require('jwt-decode');
const path = require('path');
const { URL, URLSearchParams } = require('url');

const NAME = '[a-z0-9](?:[a-z0-9-]*[a-z0-9])?';
const RESOURCE_NAME = '[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?';
const nativeDeployment = new RegExp(
  `^/consolev3/${NAME}/clusters/${NAME}/projects/${NAME}/deployments(?:/${RESOURCE_NAME}(?:/${NAME})*)?/?$`,
);
const projectNavigator = new RegExp(
  `^/project-console/(?:dashboard|access/workspaces|workspaces/${NAME}/(?:overview|projects)|${NAME}/clusters/${NAME}/projects/${NAME}/overview)$`,
);
const authenticationPath = /^\/(?:login|logout|password\/confirm|oauth\/login)(?:\/|$)/;

function hasValidEntryQuery(url) {
  const seen = new Set();
  for (const [key, value] of url.searchParams) {
    if (seen.has(key)) return false;
    seen.add(key);
    if (key === 'enhancement') {
      if (
        nativeDeployment.test(url.pathname) &&
        /\/deployments\/[^/]+\//.test(url.pathname) &&
        value === 'config-reference'
      )
        continue;
      return false;
    }
    if (['page', 'limit'].includes(key) && /^[1-9][0-9]{0,8}$/.test(value)) continue;
    if (
      key === 'cluster' &&
      projectNavigator.test(url.pathname) &&
      new RegExp(`^${NAME}$`).test(value)
    )
      continue;
    if (['name', 'sortBy'].includes(key) && /^[a-zA-Z0-9_.-]{1,100}$/.test(value)) continue;
    if (key === 'ascending' && ['true', 'false'].includes(value)) continue;
    return false;
  }
  return true;
}

function getConsoleReturnPath(input) {
  if (typeof input !== 'string' || input.length > 4096) return null;
  let value = input;
  if (value.startsWith('%')) {
    try {
      value = decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\x00-\x20\x7f]|%(?:0[0-9a-f]|1[0-9a-f]|7f)/i.test(value) ||
    /%(?![0-9a-f]{2})/i.test(value)
  )
    return null;
  let url;
  try {
    url = new URL(value, 'http://console.invalid');
  } catch {
    return null;
  }
  const rawPath = value.split(/[?#]/)[0];
  if (
    url.origin !== 'http://console.invalid' ||
    rawPath !== url.pathname ||
    /%(?:2f|5c|25)/i.test(rawPath) ||
    url.pathname === '/' ||
    authenticationPath.test(url.pathname)
  )
    return null;
  const native = url.pathname.startsWith('/consolev3');
  const navigator = url.pathname.startsWith('/project-console');
  if (native && !nativeDeployment.test(url.pathname)) return null;
  if (navigator && !projectNavigator.test(url.pathname)) return null;
  if ((native || navigator) && (url.hash || !hasValidEntryQuery(url))) return null;
  return url.pathname + url.search + url.hash;
}

function getLoginReferer(ctx) {
  const value = ctx.query?.referer ?? new URLSearchParams(ctx.querystring || '').get('referer');
  if (typeof value !== 'string' || value.startsWith('%')) return null;
  const result = getConsoleReturnPath(value);
  return result === '/dist/' ? '/dashboard' : result;
}

const manifests = new Map();

function getConsoleEntryFlags() {
  return {
    auth: process.env.KS_CONSOLE_LIGHT_AUTH === 'true',
    navigator: process.env.KS_CONSOLE_PROJECT_NAVIGATOR === 'true',
    enhancement: process.env.KS_CONSOLE_DEPLOYMENT_ENHANCEMENT === 'true',
  };
}

function getConsoleEntryManifest(name) {
  const root = path.resolve(process.cwd(), 'dist');
  const filename = path.join(root, 'entry/manifest.json');
  if (manifests.has(filename)) return manifests.get(filename)[name] || null;
  try {
    const input = JSON.parse(fs.readFileSync(filename, 'utf8'));
    const accepted = {};
    for (const entry of ['auth', 'navigator', 'config-reference']) {
      const value = input[entry];
      if (!value || !Array.isArray(value.js) || !value.js.length || !Array.isArray(value.css))
        continue;
      const assets = [...value.js, ...value.css];
      if (
        !assets.every(
          asset =>
            typeof asset === 'string' &&
            /^entry\/[\w./-]+$/.test(asset) &&
            !asset.includes('..') &&
            fs.statSync(path.join(root, asset)).isFile(),
        )
      )
        continue;
      accepted[entry] = Object.freeze({
        js: Object.freeze([...value.js]),
        css: Object.freeze([...value.css]),
      });
    }
    manifests.set(filename, accepted);
    return accepted[name] || null;
  } catch {
    return null;
  }
}

// This identifies an existing cookie for parent/frame consistency. API requests
// continue to authorize every resource read and write on the backend.
function getConsoleSessionIdentity(ctx) {
  try {
    const token = ctx.cookies.get('token');
    if (!token) return null;
    const value = jwtDecode(token);
    if (
      typeof value.username !== 'string' ||
      typeof value.exp !== 'number' ||
      value.exp * 1000 <= Date.now()
    )
      return null;
    return { username: value.username };
  } catch {
    return null;
  }
}

module.exports = {
  getConsoleReturnPath,
  getLoginReferer,
  getConsoleEntryFlags,
  getConsoleEntryManifest,
  getConsoleSessionIdentity,
};
