#!/usr/bin/env node
/**
 * Cold-start baseline smoke for release-4.1.5 (true-cold methodology).
 *
 * IMPORTANT (2026-11-03):
 * Older runs pre-opened the list page then cleared sessionStorage only. That left
 * HTTP cache hot (transferSize=0) and reported ~1s "cold" falsely.
 *
 * Current method:
 * - true_cold: fresh BrowserContext + CDP Network.setCacheDisabled; login then
 *   FIRST navigation to deployments (no pre-hydrate); visible = real list name
 * - warm_hard_refresh: same context, second goto after true_cold (HTTP cache warm)
 * - spa: overview → deployments keep-alive (after warm)
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

/**
 * True-cold ceilings are intentionally higher than the old false-cold 5s/3.5s.
 * Override with KS_COLD_MS / KS_WARM_MS / KS_SPA_MS if needed.
 */
const THRESH = {
  hard_refresh_cold_ms: Number(process.env.KS_COLD_MS || 8000),
  hard_refresh_warm_ms: Number(process.env.KS_WARM_MS || 5000),
  spa_activate_ms: Number(process.env.KS_SPA_MS || 3000),
  cold_min_transfer_bytes: Number(process.env.KS_COLD_MIN_XFER || 1_000_000),
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
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
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
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 45000 });
}

async function waitVisible(page, timeoutMs = 120000) {
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
    await page.waitForTimeout(50);
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

function attachTimeline(page, events, getNavStart) {
  const onReq = r => {
    const navStart = getNavStart();
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
  return () => page.off('request', onReq);
}

async function collectTransferStats(page) {
  return page.evaluate(() => {
    const v3 = performance
      .getEntriesByType('resource')
      .filter(e => /\/dist\/v3dist\//.test(e.name));
    return {
      v3_count: v3.length,
      transfer_sum: v3.reduce((s, e) => s + (e.transferSize || 0), 0),
      encoded_sum: v3.reduce((s, e) => s + (e.encodedBodySize || 0), 0),
      cached_like: v3.filter(e => e.transferSize === 0 && e.encodedBodySize > 0).length,
    };
  });
}

function summarizeEvents(events) {
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
    first_manifest_ms: firstManifest,
    first_html_ms: firstHtml,
    first_main_js_ms: firstMainJs,
    first_main_css_ms: firstMainCss,
    first_main_ms: mainEarliest,
    first_dashboard_ms: firstDash,
    main_before_or_with_html:
      mainEarliest != null && firstHtml != null ? mainEarliest <= firstHtml + 50 : false,
    // true-cold: preload and BFF often start within a small race window (±300ms)
    main_near_html:
      mainEarliest != null && firstHtml != null
        ? Math.abs(mainEarliest - firstHtml) <= 300 || mainEarliest <= firstHtml + 50
        : false,
    dash_after_html: firstDash == null || firstHtml == null ? null : firstDash - firstHtml,
    events: events.slice(0, 30),
  };
}

async function measureNavigation(page, { label }) {
  const dep = `${BASE}${PROJECT}/deployments`;
  const events = [];
  let navStart = 0;
  const detach = attachTimeline(page, events, () => navStart);

  navStart = Date.now();
  await page.goto(dep, { waitUntil: 'domcontentloaded' });
  const dcl = Date.now() - navStart;
  const visible_ms = await waitVisible(page);
  // allow deferred dashboard request to show up
  await page.waitForTimeout(5000);
  detach();
  const transfer = await collectTransferStats(page);
  return {
    label,
    domcontentloaded_ms: dcl,
    visible_ms,
    total_wall_ms: Date.now() - navStart,
    transfer,
    ...summarizeEvents(events),
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

  // --- true cold: fresh context, cache disabled, no pre-hydrate ---
  const coldCtx = await browser.newContext();
  const coldPage = await coldCtx.newPage();
  const coldCdp = await coldCtx.newCDPSession(coldPage);
  await coldCdp.send('Network.enable');
  await coldCdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await ensureLogin(coldPage, creds);
  await coldPage.evaluate(() => {
    try {
      sessionStorage.clear();
      localStorage.clear();
    } catch (_) {}
  });
  const true_cold = await measureNavigation(coldPage, { label: 'true_cold_nocache' });
  await coldCtx.close();

  // --- warm hard refresh: fresh login, hydrate once, then timed goto (cache on) ---
  const warmCtx = await browser.newContext();
  const warmPage = await warmCtx.newPage();
  await ensureLogin(warmPage, creds);
  await warmPage.goto(`${BASE}${PROJECT}/deployments`, { waitUntil: 'domcontentloaded' });
  await waitVisible(warmPage);
  await warmPage.waitForTimeout(1000);
  const warm = await measureNavigation(warmPage, { label: 'warm_hard_refresh' });
  const spa = await spaOverviewToDeployments(warmPage);
  await warmCtx.close();

  const gates = {
    true_cold_list_visible:
      true_cold.visible_ms != null && true_cold.visible_ms < THRESH.hard_refresh_cold_ms,
    true_cold_uncached_transfer:
      (true_cold.transfer?.transfer_sum || 0) >= THRESH.cold_min_transfer_bytes &&
      (true_cold.transfer?.cached_like || 0) === 0,
    warm_list_visible: warm.visible_ms != null && warm.visible_ms < THRESH.hard_refresh_warm_ms,
    // warm must still show host preload beating/tying HTML; true-cold allows ±300ms race
    true_cold_main_near_html: true_cold.main_near_html === true,
    warm_main_overlaps_html: warm.main_before_or_with_html === true,
    true_cold_no_early_dashboard:
      true_cold.first_dashboard_ms == null ||
      true_cold.first_html_ms == null ||
      true_cold.first_dashboard_ms >= true_cold.first_html_ms,
    spa_overview_to_deployments:
      spa.visible_ms != null && spa.visible_ms < THRESH.spa_activate_ms && spa.alive === true,
  };
  const pass = Object.values(gates).every(Boolean);

  const out = {
    date: new Date().toISOString(),
    purpose: 'true-cold baseline smoke (methodology fix 2026-11-03)',
    methodology: {
      true_cold: 'fresh context + Network.setCacheDisabled; first deployments nav after login',
      warm: 'hydrate once then hard refresh with HTTP cache allowed',
      visible: 'iframe /deployments body matches LIST_TEXT (wes-v2-server)',
      rejects_false_cold: 'true_cold requires transfer_sum>=1MiB and cached_like===0',
    },
    errata:
      'Do not compare visible_ms to pre-2026-11-03 ~1s numbers; those were HTTP-cache-hot false cold.',
    historical_reference: {
      p0_full_retest_cold_ms: 3080,
      p0_full_retest_warm_ms: 1965,
      source: 'cold-start-p0-full-retest-20261031.json',
      note: 'P0 cold used new context without list pre-hydrate; closer to true cold than #15 smoke',
    },
    baseline_image_tip: 'release-4.1.5-merged-20261102-ad724a3',
    image: process.env.KS_IMAGE || '',
    imageID: process.env.KS_IMAGE_ID || '',
    pod: process.env.KS_POD || '',
    deploy: 'ks-console-v415-rea @ 192.168.2.131:30881',
    script: 'scripts/cold-start-baseline-smoke.mjs',
    thresholds_ms: THRESH,
    true_cold,
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
        true_cold: {
          visible_ms: true_cold.visible_ms,
          total_wall_ms: true_cold.total_wall_ms,
          transfer_sum: true_cold.transfer?.transfer_sum,
          cached_like: true_cold.transfer?.cached_like,
          first_main_ms: true_cold.first_main_ms,
          first_html_ms: true_cold.first_html_ms,
          first_dashboard_ms: true_cold.first_dashboard_ms,
        },
        warm: {
          visible_ms: warm.visible_ms,
          transfer_sum: warm.transfer?.transfer_sum,
          cached_like: warm.transfer?.cached_like,
          first_main_ms: warm.first_main_ms,
          first_html_ms: warm.first_html_ms,
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
