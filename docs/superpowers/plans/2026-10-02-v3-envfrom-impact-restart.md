# V3 环境变量引用与配置变更重启 Implementation Plan

> 状态：已废弃。完整 V3 源码不可获得；本计划中的自研影响分析、用户确认重启和 PodTemplate 重启 PATCH 不再执行，由独立 Stakater Reloader 负责配置变更后的自动滚动更新。当前计划见 [`2026-10-04-config-reference-reloader.md`](./2026-10-04-config-reference-reloader.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**Goal:** 在不替换或削弱现有 V3 工作负载完整表单的前提下，支持 `envFrom` 整体引用 ConfigMap/Secret，并在保存配置资源后识别受影响工作负载，由用户选择是否异步滚动重启。

**Architecture:** 继续以 `kse-console-v3` 作为完整表单和资源编辑实现，Console 只消费一次性完整 `v3dist` 制品，不接管工作负载编辑路由。配置引用影响分析和重启编排复用 V3 已有的 Kubernetes 资源 GET/PATCH API：前端只读取资源元数据与 Pod 模板中的引用名称，不读取 Secret 数据；保存后先查询 Deployment/StatefulSet/DaemonSet/CronJob，再由用户选择并行提交带 `kubesphere.io/restartedAt` 的 PodTemplate patch。

**Tech Stack:** React 16, MobX, Jest/Enzyme, KubeSphere V3 stores/actions, Webpack full `dist`, existing Kubernetes resources API.

**Spec:** `docs/designs/2026-10-01-workload-envfrom-console-native-design.md` and backend requirement record `../kubesphere/docs/PLAN.md`.

## Global Constraints

- 不修改 `console` 现有 `/consolev3` 路由，也不把原生精简 `WorkloadEdit` 作为完整编辑器。
- 不读取、展示或记录 Secret `data`；影响分析只比较 Secret/ConfigMap 名称。
- `env`、`envFrom` 必须在同一“环境变量”区域并存；已有副本、端口、卷、探针、调度、服务等 V3 字段必须继续可编辑。
- ConfigMap/Secret 保存后的默认行为是保存，不自动重启；用户在影响确认面板中显式选择工作负载后才 PATCH。
- 只允许 Deployment、StatefulSet、DaemonSet、CronJob 进入影响列表；Job 不作为长期工作负载重启对象。
- V3 制品只能完整构建、完整替换并校验 `manifest.json`；禁止替换单个 JS/CSS chunk。
- 代码提交使用中文提交信息；暂不合并 `master` 或官方 `release-4.1`。

---

### Task 1: 固化 V3 `envFrom` 数据模型与完整表单回归

**Files:**

- Modify: `../kse-console-v3/src/components/Inputs/EnvironmentInput/index.jsx`
- Modify: `../kse-console-v3/src/components/Inputs/EnvironmentInput/EnvFromInput/index.jsx`
- Modify: `../kse-console-v3/src/components/Inputs/EnvironmentInput/EnvFromInput/Item.jsx`
- Modify: `../kse-console-v3/src/components/Inputs/EnvironmentInput/envFrom.js`
- Test: `../kse-console-v3/src/components/Inputs/EnvironmentInput/envFrom.test.js`
- Test: `../kse-console-v3/src/components/Inputs/EnvironmentInput/EnvFromInput/index.test.js`

**Interfaces:**

- `cleanEnvFrom(values: Array<object>): Array<object>` removes rows without a reference name before submit.
- `toEnvFromReference(type: 'configMap'|'secret', name: string, prefix?: string)` returns a Kubernetes `envFrom` entry.
- `EnvFromInput` receives `{ value, onChange, namespace, cluster }`, loads name-only ConfigMap/Secret lists, and renders as a sibling subsection below ordinary `env` rows.

- [ ] **Step 1: Add/adjust failing tests** for ConfigMap and Secret serialization, prefix preservation, duplicate detection by `(kind,name)`, empty-row removal, loading/error/retry/empty states, and preservation of ordinary `env` rows.
- [ ] **Step 2: Run focused tests**
      `corepack yarn test src/components/Inputs/EnvironmentInput/envFrom.test.js src/components/Inputs/EnvironmentInput/EnvFromInput/index.test.js --runInBand`
      Expected: new assertions fail before implementation and existing assertions remain green.
- [ ] **Step 3: Implement the minimum model/UI changes** without changing the parent V3 workload step list; use metadata/name-only list requests for both resource types and keep ordinary `valueFrom.configMapKeyRef`/`secretKeyRef` behavior unchanged.
- [ ] **Step 4: Normalize submit payload** so malformed empty `envFrom` rows are omitted while valid `env` and `envFrom` arrays are retained in `spec.template.spec.containers[*]`.
- [ ] **Step 5: Re-run focused tests and V3 lint**
      `corepack yarn test src/components/Inputs/EnvironmentInput/envFrom.test.js src/components/Inputs/EnvironmentInput/EnvFromInput/index.test.js --runInBand`
      `corepack yarn lint`
- [ ] **Step 6: Commit** in `kse-console-v3` with `功能: 完善工作负载配置引用表单`.

### Task 2: Add configuration-impact discovery and selected restart confirmation

**Files:**

- Create: `../kse-console-v3/src/components/Modals/ConfigReferenceImpact/index.jsx`
- Create: `../kse-console-v3/src/components/Modals/ConfigReferenceImpact/index.scss`
- Create: `../kse-console-v3/src/utils/configReferenceImpact.js`
- Create: `../kse-console-v3/src/utils/configReferenceImpact.test.js`
- Modify: `../kse-console-v3/src/stores/workload/index.js`
- Modify: `../kse-console-v3/src/actions/configmap.js`
- Modify: `../kse-console-v3/src/actions/secret.js`
- Modify: `../kse-console-v3/src/locales/zh/l10n-projects-applicationWorkloads-deployments-details.js`
- Modify: `../kse-console-v3/src/locales/en/l10n-projects-applicationWorkloads-deployments-details.js`

**Interfaces:**

- `findConfigReferenceImpact(workloads, kind, name): Array<{kind,name,namespace,cluster,reason}>` checks only `spec.template.spec.containers[].envFrom[].configMapRef.name` and `.secretRef.name`.
- `getWorkloadReferenceStores({ cluster, namespace })` returns one V3 `WorkloadStore` per supported kind.
- `ConfigReferenceImpact` receives `{ visible, references, onConfirm, onCancel, isSubmitting }`; confirm returns selected references and never returns Secret values.
- `WorkloadStore.recreate(detail)` PATCHes only `spec.template.metadata.annotations['kubesphere.io/restartedAt']` with an ISO timestamp.

- [ ] **Step 1: Write utility tests** covering all four workload kinds, multiple containers, both `envFrom` forms, no-reference results, and duplicate references.
- [ ] **Step 2: Run utility tests to verify failure**
      `corepack yarn test src/utils/configReferenceImpact.test.js --runInBand`
- [ ] **Step 3: Implement pure impact discovery** and make it ignore ordinary key-level `env`, volume mounts, and all Secret data fields.
- [ ] **Step 4: Add `WorkloadStore.recreate`** using the existing PATCH path and the same annotation key used by current V3 “重新部署” action; keep the operation independent from the full workload edit modal.
- [ ] **Step 5: Implement the confirmation modal** with loading, empty result, per-row checkbox (default unchecked), “仅保存” and “保存并重启所选” actions, submitting state, and per-workload success/failure status. The modal must remain usable if one PATCH fails.
- [ ] **Step 6: Wire ConfigMap and Secret update success** so the resource update closes first, then starts asynchronous impact discovery; no impact means a normal success notification, impact means the confirmation modal.
- [ ] **Step 7: Add Chinese/English copy** for discovery, no-impact, selection, save-only, restart, partial failure, and retry states; do not hard-code text in components.
- [ ] **Step 8: Run V3 tests/lint**
      `corepack yarn test src/utils/configReferenceImpact.test.js src/components/Inputs/EnvironmentInput/envFrom.test.js src/components/Inputs/EnvironmentInput/EnvFromInput/index.test.js --runInBand`
      `corepack yarn lint`
- [ ] **Step 9: Commit** in `kse-console-v3` with `功能: 配置变更支持影响分析与选择重启`.

### Task 3: Build and validate the complete V3 artifact

**Files:**

- Modify: `../kse-console-v3/.github/workflows/build-v3dist.yml` only if the artifact packaging step cannot preserve the existing full manifest.
- Create/Update: `../kse-console-v3/dist/.v3dist-source.json` generated by the build; never hand-edit hashed assets.

**Interfaces:**

- Build input is the committed V3 source from `feature/v3-artifact-decouple`.
- Build output is the complete `dist/` directory with `manifest.json`, `main.*`, all route chunks, CSS, fonts, and editor assets.

- [ ] **Step 1: Run a clean dependency install and full build**
      `corepack yarn install --frozen-lockfile`
      `V3_PUBLIC_PATH=/dist/v3dist/ corepack yarn build:client`
- [ ] **Step 2: Verify artifact completeness** by checking `dist/manifest.json`, `entrypoints.main.js`, `entrypoints.main.css`, the referenced files, and the expected non-trivial asset count; fail if any manifest target is missing.
- [ ] **Step 3: Run the V3 production smoke test** with the built artifact and verify the workload route loads the full editor, not the Console native compact form.
- [ ] **Step 4: Publish the artifact from the V3 branch** and record the source commit in `.v3dist-source.json`.
- [ ] **Step 5: Commit** workflow/metadata changes in Chinese only if they were required for reproducibility.

### Task 4: Atomically consume the complete artifact in Console

**Files:**

- Modify: `../console/packages/bootstrap/assets/v3dist/**` by replacing the directory atomically with the complete Task 3 artifact.
- Modify: `../console/packages/bootstrap/assets/v3dist/.v3dist-source.json` with source ref/commit.
- Test: `../console/packages/bootstrap` manifest/resource loading checks.

**Interfaces:**

- Console’s V3 loader consumes `manifest.json` and all referenced hashed files from one artifact version.
- No Console route code is changed for this feature.

- [ ] **Step 1: Record current artifact manifest/hash** for rollback.
- [ ] **Step 2: Replace the whole `v3dist` directory**, never copy selected chunks into the old directory.
- [ ] **Step 3: Verify every manifest target exists and that no stale target from the old manifest remains referenced.**
- [ ] **Step 4: Build the Console and run route smoke checks** for ConfigMaps, Secrets, workload list, workload create/edit, and deployments/statefulsets/daemonsets details.
- [ ] **Step 5: Commit** in `console/feature/workload-envfrom-console` with `功能: 接入完整V3配置引用制品`.

### Task 5: Test in the 192.168.2.131 environment

**Files:**

- Create: `docs/test-evidence/2026-10-02-envfrom-impact-restart.md` in the active project repository.

- [ ] **Step 1: Build and push Console/V3 images through the existing GitHub Actions path**; do not manually claim success before the action result is green.
- [ ] **Step 2: Deploy the image to the test cluster** without changing unrelated services or credentials.
- [ ] **Step 3: Create one ConfigMap and one Secret plus Deployment, StatefulSet, DaemonSet, and CronJob references in a disposable namespace.**
- [ ] \*\*Step 4: Edit ConfigMap and verify the impact panel lists only workloads referencing that ConfigMap; verify Secret values are never shown in browser/network logs.
- [ ] \*\*Step 5: Choose “仅保存” and verify no PodTemplate annotation or pod replacement occurs.
- [ ] \*\*Step 6: Repeat and choose selected restart; verify only selected workload templates receive a new `kubesphere.io/restartedAt` and pods roll; verify partial-failure status is visible if a selected target is unauthorized.
- [ ] \*\*Step 7: Verify full V3 workload editor fields remain present and `envFrom` survives create/edit/reopen for Deployment, StatefulSet, and DaemonSet.
- [ ] \*\*Step 8: Record command output, action URL, image tag, browser screenshots, and rollback artifact manifest in the evidence document.

### Task 6: Review gate and handoff

- [ ] **Step 1: Run `git diff --check` in all changed repositories.**
- [ ] \*\*Step 2: Run the verification-before-completion checklist: tests, build, manifest completeness, deployed image identity, and cluster behavior must all have fresh output.
- [ ] \*\*Step 3: Request a review of the V3 artifact boundary and restart safety before merging; do not merge to `master` or `release-4.1`.
- [ ] \*\*Step 4: Update `docs/PLAN.md` with completed P0 items and remaining follow-ups only after test evidence exists.
