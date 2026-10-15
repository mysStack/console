# ConfigMap/Secret 原生详情路由 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ConfigMap/Secret 详情页从 Shadow DOM 注入迁移为 V4 原生四 Tab 路由，保持现有能力并消除路由和布局错位。

**Architecture:** 详情容器直接使用现有 ConfigMap/Secret store 和 `DetailPage`，子路由从 DetailPage 上下文读取资源。数据、修改记录、元数据和事件分别由现有数据组件、`ConfigHistoryPage`、共享 `MetaData` 和共享 `Events` 渲染。Deployment 等工作负载仍使用 V3，不参与迁移。

**Tech Stack:** React, React Router, TypeScript, `@ks-console/shared`, `@kubed/components`, Node test runner + `esno`, Playwright CLI, Kubernetes 131 测试集群。

**Spec:** `docs/superpowers/specs/2026-10-10-config-resource-native-detail-design.md`

## Global Constraints

- 不读取、输出或提交真实凭据；浏览器测试使用用户提供的专用测试账号环境变量。
- 不修改 V3 制品，不删除 V3 工作负载路由。
- 不改变 ConfigMap/Secret API、RBAC 或历史 Secret 格式。
- 新增行为先写失败测试，再实现。
- 131 只作为测试环境；不修改 133 或生产环境。
- 不提交 `.playwright-cli/`、截图、dist 或其他生成物。

### Task 1: 锁定原生 ConfigMap/Secret 路由契约

**Files:**

- Create: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/routes.test.ts`
- Create: `packages/console/src/pages/projects/containers/Secrets/Detail/routes.test.ts`
- Modify: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/routes.tsx`
- Modify: `packages/console/src/pages/projects/containers/Secrets/Detail/routes.tsx`

**Interfaces:**

- Produces four route entries for each resource: `detail`, `revision-control`, `metadata`, `events`.
- The route modules export the same default route-array shape already consumed by `projects/routes/detail.tsx`.

- [ ] **Step 1: Write failing route tests**

Assert that each route module contains exactly the four paths and no `env` path.

```ts
import assert from 'node:assert';
import test from 'node:test';
import routes from './routes';

test('ConfigMap detail exposes native data/history/metadata/events tabs', () => {
  assert.deepEqual(
    routes.map(route => route.path),
    ['detail', 'revision-control', 'metadata', 'events'],
  );
});
```

- [ ] **Step 2: Run the tests and verify they fail**

Run:

```bash
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/Detail/routes.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/Detail/routes.test.ts
```

Expected: failure because the current routes only contain `detail`.

- [ ] **Step 3: Implement the four route entries**

Add imports for the native Data, RevisionControl, Metadata and Events components and map each path to its component. Keep the index redirect to `detail`.

- [ ] **Step 4: Run route tests**

Expected: both route tests pass with four paths and no `env` route.

### Task 2: Replace ConfigMap/Secret Wujie detail shells with native DetailPage containers

**Files:**

- Modify: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/index.tsx`
- Modify: `packages/console/src/pages/projects/containers/Secrets/Detail/index.tsx`
- Create or reuse: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/Data/index.tsx`
- Create or reuse: `packages/console/src/pages/projects/containers/Secrets/Detail/Data/index.tsx`

**Interfaces:**

- The detail containers keep `configMapStore`/`secretStore`, existing actions, `DetailPageRef`, and the existing data components.
- The detail containers no longer import `WujieReact` or `useConfigHistoryEntry`.

- [ ] **Step 1: Add a shell-level regression test**

Add a source-contract test that reads the two detail container files and asserts they contain `DetailPage`, the corresponding store, and no `WujieReact`/`useConfigHistoryEntry` imports.

- [ ] **Step 2: Run the test and verify it fails**

Run the two resource tests. Expected: failure because the current shells still use Wujie and injected history.

- [ ] **Step 3: Port the existing native cluster detail implementation**

Use `clusters/containers/Configuration/Configmaps/Detail/index.tsx` and its Secret counterpart as the reference. Preserve actions and callbacks from the existing project resource pages, change only route paths and the DetailPage child components needed by this project route.

- [ ] **Step 4: Run shell tests and targeted lint**

Run:

```bash
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/Detail/shell.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/Detail/shell.test.ts
corepack yarn eslint packages/console/src/pages/projects/containers/ConfigMaps/Detail packages/console/src/pages/projects/containers/Secrets/Detail
```

Expected: tests pass and ESLint exits 0.

### Task 3: Add native metadata, events and history children

**Files:**

- Create: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/Metadata/index.tsx`
- Create: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/Events/index.tsx`
- Create: `packages/console/src/pages/projects/containers/ConfigMaps/Detail/RevisionControl/index.tsx`
- Create: `packages/console/src/pages/projects/containers/Secrets/Detail/Metadata/index.tsx`
- Create: `packages/console/src/pages/projects/containers/Secrets/Detail/Events/index.tsx`
- Create: `packages/console/src/pages/projects/containers/Secrets/Detail/RevisionControl/index.tsx`
- Modify: `packages/console/src/pages/projects/components/ConfigHistory/entry.tsx`
- Modify: `packages/console/src/pages/projects/components/ConfigHistory/index.tsx` only if a native route adapter is needed

**Interfaces:**

- Metadata components consume `useDetailPage` and render `MetaData detail={detail}`.
- Events components consume `useDetailPage` and render shared `Events` with the correct module.
- Revision components consume `useDetailPage` identity fields and render `ConfigHistoryPage` directly with `kind`.

- [ ] **Step 1: Add child-component tests first**

Test that the metadata adapter forwards labels/annotations, the event adapter forwards module/detail, and history adapter builds the expected `cluster/namespace/name/kind` props without Wujie.

- [ ] **Step 2: Run tests and verify the missing native adapters fail**

Expected: import or assertion failures because the six native child files do not exist.

- [ ] **Step 3: Implement the six adapters**

Follow the existing workload `Metadata`, `Events`, `RevisionControl` components and the current `ConfigHistoryPage` prop contract. Use `Loading`/empty states consistent with shared detail pages.

- [ ] **Step 4: Remove ConfigMap/Secret injection code**

Delete `useConfigHistoryEntry` calls and Wujie imports from ConfigMap/Secret detail shells. Keep the generic history module only for the native revision route and standalone history route if still referenced.

- [ ] **Step 5: Run targeted tests and lint**

Run the ConfigHistory, route, shell and adapter tests plus ESLint on all touched files.

### Task 4: Full regression and 131 browser acceptance

**Files:**

- No production files unless a test exposes a concrete regression.
- Evidence: `output/playwright/config-resource-native-131-*` (not committed).

- [ ] **Step 1: Run repository unit tests**

```bash
sh scripts/test.sh
```

Expected: zero failed files and zero failed tests.

- [ ] **Step 2: Run formatting, lint and diff checks**

```bash
corepack yarn prettier --check <all touched files>
corepack yarn eslint <all touched files>
git diff --check
```

- [ ] **Step 3: Build the console image through the repository Action**

Push only the intended source files and manually trigger `build-personal-images.yml` with `source_ref=feature/config-history` and a date/commit test tag. Monitor both Action jobs and record the run ID and image tag.

- [ ] **Step 4: Deploy only to 192.168.2.131**

Confirm the `ks-console` container name and update only the 131 `kubesphere-system/ks-console` Deployment to the Action-produced image. Wait for `kubectl rollout status` and verify one Ready pod.

- [ ] **Step 5: Execute Playwright acceptance after user login**

Open these real-resource routes in 131 and capture snapshots/screenshots:

```text
/test-workspace/clusters/host/projects/test-wes/configmaps/<name>/detail
/test-workspace/clusters/host/projects/test-wes/secrets/<name>/detail
/test-workspace/clusters/host/projects/test-wes/deployments/wes-v2-server/resource-status
/test-workspace/clusters/host/projects/test-wes/deployments/wes-v2-server/env
```

Verify direct navigation, refresh, tab changes and back/forward navigation. Confirm ConfigMap/Secret have exactly Data/Revision/Metadata/Events; confirm Deployment retains Resource Status/Revision/Metadata/Monitoring(if enabled)/Env/Config Reference/Events.

- [ ] **Step 6: Report evidence and remaining risks**

Report exact commands, Action run, image tag, rollout output, browser evidence paths, and any unexecuted checks. Do not claim completion if login or a real-data route remains unverified.
