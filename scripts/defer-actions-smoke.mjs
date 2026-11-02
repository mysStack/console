#!/usr/bin/env node
/**
 * Smoke after deferring consoleV3Actions preload:
 * - list visible timing
 * - dashboard HTML must start after consolev3 render + ~2s delay floor
 * - dashboard should not overlap late list chunks as aggressively as baseline
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
  '/home/bruce/code/ks-develop/console-defer-actions/docs/v4-migration/evidence/defer-actions-smoke-20261102.json';
const IMAGE = process.env.KS_IMAGE || '';
const IMAGE_ID = process.env.KS_IMAGE_ID || '';
const POD = process.env.KS_POD || '';

function loadCreds() {
  const bashrc = readFileSync('/home/bruce/.bashrc', 'utf8');
  const user = bashrc.match(/^export KS_TEST_USERNAME='([^']+)'/m)?.[1];
  const pass = bashrc.match(/^export KS_TEST_PASSWORD=(.+)$/m)?.[1]?.trim();
  if (!user || !pass) throw new Error('KS_TEST_* missing in bashrc');
  return { user, pass };
}

async function ensureLogin(page, creds) {
  if (!page.url().includes('/login')) return;
  await page.fill(
    'input[placeholder="user@example.com"], input[name="username"], input[type="text"]',
    creds.user,
  );
  await page.fill('input[placeholder="Password"], input[type="password"]', creds.pass);
  await page.click('button:has-text("Log In"), button[type="submit"]');
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 30000 });
}

async function waitIframe(page, pathPart, textRe, timeoutMs = 45000) {
  const t0 = await page.evaluate(() => performance.now());
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const hit = await page.evaluate(
      ({ pathPart, src }) => {
        const re = new RegExp(src);
        for (const f of document.querySelectorAll('iframe')) {
          try {
            const path = f.contentWindow?.location?.pathname || '';
            const text =
              (f.contentDocument && f.contentDocument.body && f.contentDocument.body.innerText) ||
              '';
            if (path.includes(pathPart) && re.test(text)) {
              return Math.round(performance.now());
            }
          } catch (_) {}
        }
        return null;
      },
      { pathPart, src: textRe.source },
    );
    if (hit != null) {
      return {
        visibleAt_perf_now: hit,
        visible_from_poll_start_ms: Math.round(hit - t0),
      };
    }
    await page.waitForTimeout(100);
  }
  throw new Error(`timeout waiting iframe ${pathPart} / ${textRe}`);
}

async function collectMarks(page) {
  // Give deferred dashboard (loadCompleted + 2s) time to appear.
  await page.waitForTimeout(4500);
  return page.evaluate(() => {
    const res = performance.getEntriesByType('resource');
    const row = e => ({
      n: e.name
        .replace(/https?:\/\/[^/]+/, '')
        .replace(/\?.*$/, '')
        .slice(0, 120),
      s: Math.round(e.startTime),
      e: Math.round(e.responseEnd),
      d: Math.round(e.duration),
      transfer: e.transferSize || 0,
    });
    const take = re =>
      res
        .filter(e => re.test(e.name))
        .map(row)
        .sort((a, b) => a.s - b.s);
    const phases = performance
      .getEntriesByType('mark')
      .filter(m => m.name.startsWith('consolev3:'))
      .map(m => ({ n: m.name.split(':')[1], t: Math.round(m.startTime) }));
    const renders = phases.filter(p => p.n === 'render').map(p => p.t);
    const firstRender = renders.length ? Math.min(...renders) : null;
    const dash = take(/\/consolev3\/dashboard/);
    const listHtml = take(/\/consolev3\/.*\/deployments/);
    const chunks = take(/\/dist\/v3dist\//);
    const hostCrd = take(/customresourcedefinitions/);
    const lastChunkEnd = chunks.length ? Math.max(...chunks.map(c => c.e)) : null;
    const firstDash = dash.length ? Math.min(...dash.map(d => d.s)) : null;
    return {
      renderMark_ms: firstRender,
      host_crd: hostCrd,
      dashboard: dash,
      list_html: listHtml,
      chunks_count: chunks.length,
      last_chunk_end_ms: lastChunkEnd,
      dashBeforeRender: firstRender == null ? dash : dash.filter(d => d.s < firstRender),
      dashAfterRender_ms: firstRender == null || firstDash == null ? null : firstDash - firstRender,
      dash_vs_last_chunk_ms:
        firstDash == null || lastChunkEnd == null ? null : firstDash - lastChunkEnd,
      first_dash_start_ms: firstDash,
    };
  });
}

async function hardRefreshRound(page, clearSession) {
  const depUrl = `${BASE}${PROJECT}/deployments`;
  if (clearSession) {
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      try {
        sessionStorage.clear();
      } catch (_) {}
    });
  } else {
    await page.goto(depUrl, { waitUntil: 'domcontentloaded' });
    await waitIframe(page, '/deployments', /wes-v2-server/, 45000);
    await page.waitForTimeout(1500);
  }

  await page.goto(depUrl, { waitUntil: 'domcontentloaded' });
  const visible = await waitIframe(page, '/deployments', /wes-v2-server/, 45000);
  const marks = await collectMarks(page);
  return {
    clearSession,
    visible_from_poll_start_ms: visible.visible_from_poll_start_ms,
    visibleAt_perf_now: visible.visibleAt_perf_now,
    ...marks,
  };
}

async function main() {
  const creds = loadCreds();
  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await ensureLogin(page, creds);

  const cold = await hardRefreshRound(page, true);
  const warm = await hardRefreshRound(page, false);

  const gates = {
    cold_no_dash_before_render: (cold.dashBeforeRender || []).length === 0,
    warm_no_dash_before_render: (warm.dashBeforeRender || []).length === 0,
    cold_dash_after_render_ge_1500:
      cold.dashAfterRender_ms == null || cold.dashAfterRender_ms >= 1500,
    warm_dash_after_render_ge_1500:
      warm.dashAfterRender_ms == null || warm.dashAfterRender_ms >= 1500,
    cold_list_visible: cold.visibleAt_perf_now != null,
    warm_list_visible: warm.visibleAt_perf_now != null,
  };
  const pass = Object.values(gates).every(Boolean);

  const out = {
    date: new Date().toISOString(),
    image: IMAGE,
    imageID: IMAGE_ID,
    pod: POD,
    deploy: 'ks-console-v415-rea @ 192.168.2.131:30881',
    commit: 'd4750300f',
    change: 'loadCompleted + 2000ms before consoleV3Actions dashboard preload',
    cold,
    warm,
    gates,
    pass,
    baseline_merged_dashboard_start_ms: 2693,
    baseline_merged_last_chunk_end_ms: 3357,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
  console.log(
    JSON.stringify(
      {
        out: OUT,
        pass,
        gates,
        cold_visible: cold.visibleAt_perf_now,
        warm_visible: warm.visibleAt_perf_now,
        cold_dashAfter: cold.dashAfterRender_ms,
        warm_dashAfter: warm.dashAfterRender_ms,
        cold_dash_vs_chunk: cold.dash_vs_last_chunk_ms,
        warm_dash_vs_chunk: warm.dash_vs_last_chunk_ms,
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
