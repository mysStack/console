#!/usr/bin/env node
/**
 * Acceptance test for the Configuration Reference feature, driven against a live
 * KubeSphere console over the Chrome DevTools Protocol.
 *
 * This is NOT a unit test and NOT part of CI. It needs a real cluster, a real
 * console and a browser with a debugging port, so wiring it into a build would
 * make the build depend on a live environment. Its value is that it covers the
 * behaviour that only exists once the extension is injected into a running
 * console — which is where every real defect in this feature was found.
 *
 * See README.md in this directory for prerequisites, fixtures and how to run it.
 *
 * usage: node config-reference.mjs --port 9333 [--match 192.168.2.131]
 */

import { setTimeout as sleep } from 'node:timers/promises';

const argv = process.argv.slice(2);
const getArg = (n, d) => {
  const i = argv.indexOf('--' + n);
  return i >= 0 ? argv[i + 1] : d;
};
const PORT = getArg('port', '9333');
const MATCH = getArg('match', '192.168.2.131');

let ws,
  nextId = 1;
const pending = new Map();
function send(method, params = {}, timeoutMs = 60000) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error('CDP timeout: ' + method));
      }
    }, timeoutMs);
  });
}
const DEEP = `
window.__deepAll = window.__deepAll || function (sel) {
  const out = [], seen = new Set();
  const walk = (root) => {
    let els = []; try { els = [...root.querySelectorAll(sel)]; } catch (e) {}
    for (const e of els) if (!seen.has(e)) { seen.add(e); out.push(e); }
    let all = []; try { all = [...root.querySelectorAll('*')]; } catch (e) {}
    for (const e of all) if (e.shadowRoot) walk(e.shadowRoot);
  };
  walk(document); return out;
};
true;`;
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', {
    expression: DEEP + '\n' + expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true,
  });
  if (r.exceptionDetails)
    throw new Error('eval: ' + (r.exceptionDetails.exception?.description || ''));
  return r.result?.value;
}

// ------------------------------------------------------------------- actions
const ROW = n => `(() => {
  const inp = window.__deepAll('input[aria-label="前缀 ${n}"]')[0];
  if (!inp) return null;
  const pill = inp.parentElement, wrapper = pill.parentElement;
  return { inp, pill, wrapper, preview: [...wrapper.children].find(c => c !== pill) };
})()`;

const setKind = (n, kind) =>
  evaluate(`(() => {
  const el = window.__deepAll('select[aria-label="引用类型 ${n}"]')[0];
  if (!el) return { err: 'no kind select' };
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(kind)});
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { value: el.value };
})()`);

const setResource = (n, name) =>
  evaluate(`(() => {
  const el = window.__deepAll('select[aria-label="引用资源 ${n}"]')[0];
  if (!el) return { err: 'no resource select' };
  const has = [...el.options].some(o => o.value === ${JSON.stringify(name)});
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(el, ${JSON.stringify(name)});
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { value: el.value, optionExists: has, optionCount: el.options.length };
})()`);

const setPrefix = (n, value) =>
  evaluate(`(() => {
  const el = window.__deepAll('input[aria-label="前缀 ${n}"]')[0];
  if (!el) return { err: 'no prefix input' };
  el.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return { value: el.value };
})()`);

const clickToggle = n =>
  evaluate(`(() => {
  const r = ${ROW(n)};
  if (!r || !r.preview) return { err: 'no preview' };
  const t = [...r.preview.querySelectorAll('span')].find(s => s.getAttribute('role') === 'button');
  if (!t) return { err: 'no toggle' };
  const before = t.textContent.trim();
  t.click();
  return { clicked: before };
})()`);

const readRow = n =>
  evaluate(`(() => {
  const r = ${ROW(n)};
  if (!r) return { row: ${n}, err: 'row missing' };
  const k = r.pill.querySelector('select[aria-label^="引用类型"]');
  const s = r.pill.querySelector('select[aria-label^="引用资源"]');
  const state = { kind: k ? k.value : null, resource: s ? s.value : null, prefix: r.inp.value };
  if (!r.preview) return { row: ${n}, ...state, preview: null, chips: [], toggle: null };
  const text = r.preview.innerText.replace(/\\n+/g, ' | ').trim();
  return {
    row: ${n}, ...state, preview: 'present', text,
    toggle: (text.match(/查看|收起/) || [null])[0],
    chips: [...r.preview.querySelectorAll('span')].filter(x => x.style && x.style.borderRadius === '100px').map(x => x.textContent.trim()),
  };
})()`);

const applyRow = async (n, spec) => {
  const problems = [];
  const kindOf = () =>
    evaluate(
      `(() => { const el = window.__deepAll('select[aria-label="引用类型 ${n}"]')[0]; return el ? el.value : null; })()`,
    );
  if (spec.kind) {
    const cur = await kindOf();
    if (cur !== spec.kind) {
      await setKind(n, spec.kind);
      // React re-renders asynchronously, so an immediate read-back is unreliable.
      await sleep(1800);
      const after = await kindOf();
      if (after !== spec.kind)
        problems.push(`row${n}: 设 kind=${spec.kind} 未生效，实际「${after}」`);
    }
  }
  if (spec.resource !== undefined) {
    const r = await setResource(n, spec.resource);
    if (r.err) problems.push(`row${n}: ${r.err}`);
    else if (r.value !== spec.resource)
      problems.push(
        `row${n}: 设 resource=「${spec.resource}」未生效，实际「${r.value}」(optionExists=${r.optionExists})`,
      );
  }
  if (spec.prefix !== undefined) {
    const r = await setPrefix(n, spec.prefix);
    if (r.err || r.value !== spec.prefix)
      problems.push(`row${n}: 设 prefix=「${spec.prefix}」失败 (${JSON.stringify(r)})`);
  }
  return problems;
};

const ensureExpanded = async n => {
  const r = await readRow(n);
  if (r && r.toggle === '查看') {
    await clickToggle(n);
    await sleep(1500);
  }
  return {};
};
const ensureCollapsed = async n => {
  const r = await readRow(n);
  if (r && r.toggle === '收起') {
    await clickToggle(n);
    await sleep(1500);
  }
  return {};
};

// ----------------------------------------------------------------- scenarios
const CM = 'configMap',
  SEC = 'secret';
const scenarios = [
  {
    name: 'S1 ConfigMap 未选资源 → 不显示预览',
    rows: { 1: { kind: CM, resource: '', prefix: '' } },
    expect: { row1: { previewNull: true } },
  },
  {
    name: 'S2 [已知缺陷] Secret 未选资源 → 不应显示预览',
    rows: { 1: { kind: SEC, resource: '', prefix: '' } },
    expect: { row1: { previewNull: true } },
    knownDefect:
      'Secret 分支的判断顺序在 resolved 检查之前：没选资源也会显示「将引入该保密字典的全部键」',
  },
  {
    name: 'S3 有键且与 env 冲突（空前缀）→ 自动展开',
    rows: { 1: { kind: CM, resource: 'wes-job', prefix: '' } },
    expect: {
      row1: {
        has: ['✓ 将生成 1 个环境变量', '1 个与环境变量重名'],
        toggle: '收起',
        chips: ['JOB_ADDRESS'],
      },
    },
  },
  {
    name: 'S4 加前缀 X_ 消解冲突 → 收起且无告警',
    rows: { 1: { kind: CM, resource: 'wes-job', prefix: 'X_' } },
    expect: {
      row1: { has: ['✓ 将生成 1 个环境变量'], notHas: ['重名', '丢弃'], toggle: '查看', chips: [] },
    },
  },
  {
    name: 'S5 点「查看」展开 chips',
    action: () => clickToggle(1),
    expect: { row1: { has: ['X_JOB_ADDRESS'], toggle: '收起', chips: ['X_JOB_ADDRESS'] } },
  },
  {
    name: 'S6 点「收起」折叠',
    action: () => clickToggle(1),
    expect: { row1: { has: ['✓ 将生成 1 个环境变量'], toggle: '查看', chips: [] } },
  },
  {
    name: 'S7 边界键：非法键被丢弃 + binaryData 不读取',
    rows: { 1: { kind: CM, resource: 'dsh-test-keys', prefix: '' } },
    action: () => ensureExpanded(1),
    expect: {
      row1: {
        has: ['✓ 将生成 1 个环境变量', '2 个键会被丢弃', '1 个 binaryData 不读取'],
        chips: ['GOOD_KEY', 'bad.key', '1STARTS_WITH_DIGIT', 'blob.bin'],
      },
    },
  },
  {
    name: 'S8 全部键非法 → 没有可生效的键',
    rows: { 1: { kind: CM, resource: 'kube-root-ca.crt', prefix: '' } },
    action: () => ensureExpanded(1),
    expect: { row1: { has: ['没有可生效的键', '1 个键会被丢弃'], chips: ['ca.crt'] } },
  },
  {
    name: 'S9 跨引用重名（两行同前缀 P_）',
    rows: {
      1: { kind: CM, resource: 'ewms-postgres-wes-config', prefix: 'P_' },
      2: { kind: CM, resource: 'wes-application', prefix: 'P_' },
    },
    expect: {
      row2: { has: ['✓ 将生成 27 个环境变量', '2 个与其它引用重名'] },
    },
    note: 'row2 的 2 个冲突来自与 row1 的同名键（P_DB_USERNAME/P_DB_WES_URL），零 env 冲突，所以应为「与其它引用重名」而非「与环境变量重名」',
  },
  {
    name: 'S10 恢复基线（切一次 kind 重置实例）',
    action: async () => {
      // Flipping the kind remounts the row (its React key contains the kind),
      // which clears the manual expand/collapse override — otherwise a leftover
      // override from S7 would mask the state we want to assert.
      await applyRow(1, { kind: SEC, resource: '', prefix: '' });
      await sleep(2200);
      await applyRow(1, { kind: CM, resource: 'wes-app', prefix: '' });
      await applyRow(2, { kind: SEC, resource: 'aliyun-registry-secret', prefix: '' });
      await sleep(3200);
      return {};
    },
    // An empty ConfigMap contributes nothing, so there is nothing to expand and
    // the toggle must not be offered.
    expect: { row1: { has: ['没有可生效的键'], noToggle: true } },
  },
  {
    name: 'S11 手动收起后，换成同样有问题的资源应重新自动展开',
    action: async () => {
      // A row with problems auto-expands. Collapse it by hand, then point it at a
      // different resource that also has problems: the manual override must not
      // survive the content change, or the warning would stay hidden.
      await applyRow(1, { kind: CM, resource: 'kube-root-ca.crt', prefix: '' });
      await sleep(4500);
      await ensureCollapsed(1);
      await sleep(1500);
      await applyRow(1, { resource: 'ewms-postgres-wes-config', prefix: '' });
      await sleep(4500);
      return {};
    },
    expect: { row1: { has: ['2 个与环境变量重名'], toggle: '收起' } },
    knownDefect:
      'expanded = override ?? hasProblems：手动点过一次后 override 若永久生效，换成有问题的资源仍会保持收起，把告警藏起来',
  },
  {
    name: 'S12 Secret 键名可见（.dockerconfigjson 会被丢弃）',
    rows: { 2: { kind: SEC, resource: 'aliyun-registry-secret', prefix: '' } },
    action: () => ensureExpanded(2),
    expect: {
      row2: { has: ['没有可生效的键', '1 个键会被丢弃'], chips: ['.dockerconfigjson'] },
    },
    note: '开启 Secret 键名预览前，这一行只显示「将引入该保密字典的全部键」，这个会被 kubelet 静默丢弃的键完全不可见',
  },
];

// ---------------------------------------------------------------------- main
const results = [];
(async () => {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const target = list.filter(t => t.type === 'page' && (t.url || '').includes(MATCH)).pop();
  if (!target) {
    console.error('no page target matching ' + MATCH);
    process.exit(2);
  }
  console.log('TARGET ' + target.url);

  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', () => rej(new Error('ws')));
  });
  ws.addEventListener('message', ev => {
    let m;
    try {
      m = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');

  if (!(await evaluate(`window.__deepAll('[data-test="config-reference-inline"]').length`))) {
    console.error('面板未打开');
    process.exit(3);
  }
  console.log('面板已打开\n');

  for (const sc of scenarios) {
    const setupProblems = [];
    for (const [n, spec] of Object.entries(sc.rows || {}))
      setupProblems.push(...(await applyRow(Number(n), spec)));
    if (sc.action) {
      const r = await sc.action();
      if (r && r.err) setupProblems.push('action: ' + r.err);
    }
    await sleep(sc.action ? 2200 : 4200);

    const rows = {};
    for (const n of [1, 2, 3]) rows[`row${n}`] = await readRow(n);

    const problems = [...setupProblems];
    for (const [key, spec] of Object.entries(sc.expect)) {
      const got = rows[key];
      if (spec.previewNull) {
        if (got.preview !== null) problems.push(`${key}: 期望无预览，实际「${got.text}」`);
        continue;
      }
      if (got.preview === null) {
        problems.push(`${key}: 期望有预览，实际没有`);
        continue;
      }
      for (const s of spec.has || [])
        if (!got.text.includes(s)) problems.push(`${key}: 缺少「${s}」`);
      for (const s of spec.notHas || [])
        if (got.text.includes(s)) problems.push(`${key}: 不该出现「${s}」`);
      if (spec.toggle && got.toggle !== spec.toggle)
        problems.push(`${key}: 按钮期望「${spec.toggle}」实际「${got.toggle}」`);
      if (spec.noToggle && got.toggle !== null)
        problems.push(`${key}: 期望没有展开按钮，实际「${got.toggle}」`);
      if (spec.chips) {
        // order-insensitive: JS hoists integer-like keys in Object.keys, so the
        // chip order is not a product contract.
        const a = [...got.chips].sort(),
          b = [...spec.chips].sort();
        if (JSON.stringify(a) !== JSON.stringify(b))
          problems.push(`${key}: chips 期望 ${JSON.stringify(b)} 实际 ${JSON.stringify(a)}`);
      }
    }
    const ok = problems.length === 0;
    results.push({ name: sc.name, ok, problems, knownDefect: sc.knownDefect, rows });
    console.log(`${ok ? 'PASS' : sc.knownDefect ? 'FAIL(已知缺陷)' : 'FAIL'}  ${sc.name}`);
    if (sc.note) console.log('        注: ' + sc.note);
    problems.forEach(p => console.log('        ! ' + p));
    Object.entries(rows).forEach(([k, v]) =>
      console.log(
        `        ${k}: kind=${v.kind} res=${v.resource || '(空)'} pfx=${v.prefix || '(空)'} → ${v.preview === null ? '(无预览)' : v.text}`,
      ),
    );
    console.log('');
  }

  const realFailures = results.filter(r => !r.ok && !r.knownDefect);
  const knownFailures = results.filter(r => !r.ok && r.knownDefect);
  console.log('================ 汇总 ================');
  console.log(
    `  用例 ${results.length}   通过 ${results.filter(r => r.ok).length}   已知缺陷 ${knownFailures.length}   意外失败 ${realFailures.length}`,
  );
  if (knownFailures.length) {
    console.log('\n  已知缺陷（预期失败，用于固化问题）:');
    knownFailures.forEach(r => console.log(`    - ${r.name}\n      ${r.knownDefect}`));
  }
  if (realFailures.length) {
    console.log('\n  意外失败:');
    realFailures.forEach(r => console.log(`    - ${r.name}: ${r.problems.join(' ; ')}`));
  }
  try {
    ws.close();
  } catch {}
  process.exit(realFailures.length ? 1 : 0);
})();
