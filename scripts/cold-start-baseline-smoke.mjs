#!/usr/bin/env node
/**
 * Fixed cold-start baseline smoke for release-4.1.5.
 *
 * Guards the closed phase floor on deployments list:
 * - hard refresh cold / warm visible timing
 * - host preload timeline (manifest / main overlaps html)
 * - deferred dashboard (no early race vs list HTML)
 * - SPA overview → deployments keep-alive activate
 *
 * Usage (from /tmp/pw-p0 with playwright deps):
 *   KS_OUT=... KS_IMAGE=... KS_IMAGE_ID=... KS_POD=... node cold-start-baseline-smoke.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = process.env.KS_BASE || 'http://192.168.2.131:30881';
const PROJECT = process.env.KS_PROJECT_PREFIX || '/dev-workspace/clusters/host/projects/dev-wes';
const CHROME =
  process.env.PW_CHROME || '/home/bruce/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const OUT =
  process.env.KS_OUT ||
  '/home/bruce/code/ks-develop/console-v3-asset-preload/docs/v4-migration/evidence/cold-start-baseline-smoke.json';
const LIST_TEXT = /wes-v2-server/;

/** P1 regression ceilings (same family as p1-full-retest). */
const THRESH = {
  hard_refresh_cold_ms: Number(process.env.KS_COLD_MS || 5000),
  hard_refresh_warm_ms: Number(process.env.KS_WARM_MS || 3500),
  spa_activate_ms: Number(process.env.KS_SPA_MS || 3000),
  dash_after_html_ms: 0,
};

function loadCreds() {
  const bashrc = readFileSync('/home/bruce/.bashrc', 'utf8');
  const user = bashrc.match(/^export KS_TEST_USERNAME='([^']+)'/m)?.[1];
  const pass = bashrc
    .match(/^export KS_TEST_PASSWORD=(.+)$/m)?.[1]
    ?.trim()
    ?.replace(/^['"]|['"]$/g, '');
  if (!user || !pass) throw new Error('KS_TEST_* missing in bashrc');
  return { user, pass };
}

async function ensureLogin(page, creds) {
  if (!page.url().includes('/login')) return;
  await page.waitForSelector(
    'input[placeholder="user@example.com"], input[name="username"], input[type="text"]',
    { timeout: 30000 },
  );
  await page.fill(
    'input[placeholder="user@example.com"], input[name="username"], input[type="text"]',
    creds.user,
  );
  await page.fill('input[placeholder="Password"], input[type="password"]', creds.pass);
  await page.click('button:has-text("Log In"), button[type="submit"]');
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 });
}

async function waitVisible(page, timeoutMs = 45000) {
  const t0 = Date.now();
  for (;;) {
    const ok = await page.evaluate(src => {
      const re = new RegExp(src);
      for (const f of document.querySelectorAll('iframe')) {
        try {
          const p = f.contentWindow?.location?.pathname || '';
          const text = f.contentDocument?.body?.innerText || '';
          if (p.includes('/deployments') && re.test(text)) return true;
        } catch (_) {}
      }
      return false;
    }, LIST_TEXT.source);
    if (ok) return Date.now() - t0;
    if (Date.now() - t0 > timeoutMs) throw new Error('visible timeout');
    await page.waitForTimeout(100);
  }
}

async function spaGo(page, path) {
  await page.evaluate(p => {
    const a = document.createElement('a');
    a.setAttribute('href', p);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, path);
  await page.waitForURL(u => u.pathname.replace(/\/$/, '') === path.replace(/\/$/, ''), {
    timeout: 45000,
  });
}

async function sandboxAlive(page) {
  return page.evaluate(() => {
    for (const f of document.querySelectorAll('iframe')) {
      try {
        const w = f.contentWindow;
        if (!w?.__WUJIE) continue;
        const path = w.location?.pathname || '';
        if (path.includes('/dashboard')) continue;
        return {
          alive: !!w.__WUJIE.alive,
          shadowKids: w.__WUJIE.shadowRoot?.children?.length ?? null,
          path,
        };
      } catch (_) {}
    }
    return { alive: null, shadowKids: null, path: null };
  });
}

async function hardRefreshRound(page, { clearSession }) {
  const dep = `${BASE}${PROJECT}/deployments`;
  await page.goto(dep, { waitUntil: 'domcontentloaded' });
  await waitVisible(page);
  if (clearSession) {
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch (_) {}
    });
  }
  await page.waitForTimeout(800);

  const events = [];
  let navStart = 0;
  const onReq = r => {
    if (!navStart) return;
    const rel = r.url().replace(BASE, '');
    const ms = Date.now() - navStart;
    if (
      /\/dist\/v3dist\/manifest\.json$/.test(rel) ||
      /\/dist\/v3dist\/main\.[^/?#]+\.(js|css)$/.test(rel) ||
      /\/consolev3\/.*\/deployments(?:\?|$)/.test(rel) ||
      /\/consolev3\/dashboard(?:\?|$)/.test(rel)
    ) {
      events.push({ ms, rel: rel.slice(0, 140), type: r.resourceType() });
    }
  };
  page.on('request', onReq);
  navStart = Date.now();
  await page.goto(dep, { waitUntil: 'domcontentloaded' });
  const visible_ms = await waitVisible(page);
  await page.waitForTimeout(5000);
  page.off('request', onReq);

  const first = re => events.find(e => re.test(e.rel))?.ms ?? null;
  const firstHtml = first(/\/consolev3\/.*\/deployments/);
  const firstMainJs = first(/\/dist\/v3dist\/main\.[^/?#]+\.js$/);
  const firstMainCss = first(/\/dist\/v3dist\/main\.[^/?#]+\.css$/);
  const firstManifest = first(/\/dist\/v3dist\/manifest\.json$/);
  const firstDash = first(/\/consolev3\/dashboard/);
  const mainEarliest =
    firstMainJs == null
      ? firstMainCss
      : firstMainCss == null
        ? firstMainJs
        : Math.min(firstMainJs, firstMainCss);

  return {
    clearSession,
    visible_ms,
    first_manifest_ms: firstManifest,
    first_html_ms: firstHtml,
    first_main_js_ms: firstMainJs,
    first_main_css_ms: firstMainCss,
    first_main_ms: mainEarliest,
    first_dashboard_ms: firstDash,
    main_before_or_with_html:
      mainEarliest != null && firstHtml != null ? mainEarliest <= firstHtml + 50 : false,
    dash_after_html: firstDash == null || firstHtml == null ? null : firstDash - firstHtml,
    events: events.slice(0, 30),
  };
}

async function spaOverviewToDeployments(page) {
  await spaGo(page, `${PROJECT}/overview`);
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  await spaGo(page, `${PROJECT}/deployments`);
  const visible_ms = await waitVisible(page);
  const snap = await sandboxAlive(page);
  return {
    nav_wall_ms: Date.now() - t0,
    visible_ms,
    ...snap,
  };
}

async function main() {
  const creds = loadCreds();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await ensureLogin(page, creds);

  const cold = await hardRefreshRound(page, { clearSession: true });
  const warm = await hardRefreshRound(page, { clearSession: false });
  const spa = await spaOverviewToDeployments(page);

  const gates = {
    cold_list_visible: cold.visible_ms != null && cold.visible_ms < THRESH.hard_refresh_cold_ms,
    warm_list_visible: warm.visible_ms != null && warm.visible_ms < THRESH.hard_refresh_warm_ms,
    cold_main_overlaps_html: cold.main_before_or_with_html === true,
    warm_main_overlaps_html: warm.main_before_or_with_html === true,
    cold_no_early_dashboard:
      cold.first_dashboard_ms == null ||
      cold.first_html_ms == null ||
      cold.first_dashboard_ms >= cold.first_html_ms + THRESH.dash_after_html_ms,
    spa_overview_to_deployments:
      spa.visible_ms != null && spa.visible_ms < THRESH.spa_activate_ms && spa.alive === true,
  };
  const pass = Object.values(gates).every(Boolean);

  const out = {
    date: new Date().toISOString(),
    purpose: 'fixed cold-start baseline smoke after phase close',
    baseline_image_tip: 'release-4.1.5-merged-20261102-ad724a3',
    image: process.env.KS_IMAGE || '',
    imageID: process.env.KS_IMAGE_ID || '',
    pod: process.env.KS_POD || '',
    deploy: 'ks-console-v415-rea @ 192.168.2.131:30881',
    script: 'scripts/cold-start-baseline-smoke.mjs',
    thresholds_ms: THRESH,
    cold,
    warm,
    spa_overview_to_deployments: spa,
    gates,
    pass,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        out: OUT,
        pass,
        gates,
        cold: {
          visible_ms: cold.visible_ms,
          first_manifest_ms: cold.first_manifest_ms,
          first_html_ms: cold.first_html_ms,
          first_main_ms: cold.first_main_ms,
          first_dashboard_ms: cold.first_dashboard_ms,
        },
        warm: {
          visible_ms: warm.visible_ms,
          first_manifest_ms: warm.first_manifest_ms,
          first_html_ms: warm.first_html_ms,
          first_main_ms: warm.first_main_ms,
          first_dashboard_ms: warm.first_dashboard_ms,
        },
        spa: {
          visible_ms: spa.visible_ms,
          alive: spa.alive,
          nav_wall_ms: spa.nav_wall_ms,
        },
      },
      null,
      2,
    ),
  );
  await browser.close();
  if (!pass) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
