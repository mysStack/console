# ConfigMap 与 Secret 原生列表实施计划

> **给执行器：** 必须按任务逐项执行，并在每个任务结束后运行对应验证。实现功能前先写测试并确认测试按预期失败。

**目标：** 将项目范围 ConfigMap 和 Secret 列表从 `ConsoleV3ResourceList` 切换为 V4 原生 `ListPage`，保留现有资源操作、作用域、详情导航和数据安全行为。

**架构：** 复用集群配置列表已经采用的 `ListPage`、`configMapStore`、`secretStore`、`useActionMenu` 和共享编辑弹窗；只替换项目列表入口和项目范围的路由链接，不删除任何 V3 公共能力。ConfigMap/Secret 详情、配置历史和配置引用继续使用当前已存在的原生组件。

**技术栈：** React 17、TypeScript、React Router 6、Kubed、`@ks-console/shared` Store、Node `node:test`。

**依据：** `docs/v4-migration/matrix.md`、`docs/v4-migration/dependency-inventory.md`、`docs/v4-migration/deployment-v3-evidence.md`。

## 全局约束

- 不修改 `release-4.1.5`；所有变更仅在 `feature/v4-migration`。
- 不删除 `wujie-react`、`v3dist` 或其他 V3 依赖；只有全量替代并通过部署验收后才能清理。
- ConfigMap 使用 `configMapStore`，Secret 使用 `secretStore`；列表请求必须保留 cluster、namespace 和分页/搜索参数。
- Secret 列表不得在新代码中解码或输出 Secret 值；只显示类型、字段数量、名称和元数据。
- 不提交既有 `.playwright-cli/`、`output/`、`AGENTS.md` 和其他未跟踪生成物。
- 项目列表的详情链接必须与 `packages/console/src/pages/projects/routes/detail.tsx` 中的项目详情路由一致。

---

### 任务 1：先补项目列表回归测试

**文件：**

- 修改：`packages/console/src/pages/projects/containers/ConfigMaps/index.test.ts`
- 创建：`packages/console/src/pages/projects/containers/Secrets/index.test.ts`

**接口：**

- 测试读取同目录的 `index.tsx` 源码，验证列表入口不再依赖 V3 包装器。
- 测试只约束可观察的组件入口和关键数据安全约束，不绑定无关的 JSX 排版。

- [x] **步骤 1：将 ConfigMap 测试改成期望原生列表**

```ts
test('ConfigMap list uses the native ListPage and shared store', () => {
  assert.match(source, /ListPage/);
  assert.match(source, /configMapStore/);
  assert.doesNotMatch(source, /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react/);
});
```

- [x] **步骤 2：新增 Secret 原生列表测试**

```ts
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(__filename.replace(/[^/]+$/, 'index.tsx'), 'utf8');

test('Secret list uses the native ListPage and shared store', () => {
  assert.match(source, /ListPage/);
  assert.match(source, /secretStore/);
  assert.doesNotMatch(source, /ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react/);
});

test('Secret list source does not decode or render secret values', () => {
  assert.doesNotMatch(source, /safeAtob|decode|base64|value\s*:/);
});
```

- [x] **步骤 3：只运行这两个测试，确认它们因当前 V3 列表实现失败**

运行：

```bash
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/index.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/index.test.ts
```

预期：ConfigMap 和 Secret 测试失败，原因是现有文件仍使用 `ConsoleV3ResourceList`；不能接受因语法错误或测试路径错误导致的失败。

---

### 任务 2：实现项目 ConfigMap 原生列表

**文件：**

- 修改：`packages/console/src/pages/projects/containers/ConfigMaps/index.tsx`
- 测试：任务 1 的 ConfigMap 测试

**接口：**

- 组件继续导出默认的 `ConfigMaps` React 组件。
- 列表使用 `configMapStore`，操作参数来自 `useParams<'cluster' | 'namespace' | 'workspace'>()`。
- 详情链接使用 `/clusters/${cluster}/projects/${namespace}/configmaps/${name}`。
- 创建、单行编辑、YAML 编辑、单行删除和批量删除沿用集群配置列表的共享 Action 与弹窗。

- [x] **步骤 1：复用集群 ConfigMap 列表的字段和操作模型**

保留以下列和行为：名称/描述、项目、字段名、创建时间、行操作；保留创建按钮、批量删除和 namespace 过滤。编辑设置时将 `activeRecord` 的 `_originData` 去掉 `data` 后提交，避免把列表映射后的数据直接当作 Kubernetes 原对象提交。

- [x] **步骤 2：将列表 Store 绑定到 `configMapStore`**

列表主体使用：

```tsx
<ListPage banner={banner} table={table} store={configMapStore} hasNamespaceSelector />
```

所有成功回调都调用 `tableRef.current?.refetch()`，编辑弹窗关闭并清理 `activeRecord`。

- [x] **步骤 3：运行 ConfigMap 测试并确认通过**

运行：

```bash
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/index.test.ts
```

预期：全部通过。

---

### 任务 3：实现项目 Secret 原生列表

**文件：**

- 修改：`packages/console/src/pages/projects/containers/Secrets/index.tsx`
- 测试：任务 1 的 Secret 测试

**接口：**

- 组件继续导出默认的 `Secrets` React 组件。
- 列表使用 `secretStore`，详情链接使用 `/clusters/${cluster}/projects/${namespace}/secrets/${name}`。
- 列表显示 Secret 类型和字段数量，不显示任何 Secret value。
- 编辑设置时提交去掉 `data` 的 `_originData`，保持现有 Secret 编辑弹窗的脱敏行为。

- [x] **步骤 1：从集群 Secret 列表复用字段、权限和操作**

保留创建、编辑信息、编辑 YAML、编辑 Secret、单行删除、批量删除、`isFedManaged` 限制和 Secret 类型翻译；使用项目详情路由，不使用集群详情的 `/detail` 后缀。

- [x] **步骤 2：绑定 `secretStore` 和 `ListPage`**

列表主体使用：

```tsx
<ListPage banner={banner} table={table} store={secretStore} hasNamespaceSelector />
```

Secret 的列只能读取 mapper 返回的类型、字段数量、名称、描述、namespace 和创建时间；不得添加值解码逻辑。

- [x] **步骤 3：运行 Secret 测试并确认通过**

运行：

```bash
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/index.test.ts
```

预期：全部通过。

---

### 任务 4：回归、检查和提交

**文件：**

- 修改：仅保留任务 1–3 的文件；不加入生成物。

- [x] **步骤 1：运行 ConfigMap/Secret 相关测试集合**

```bash
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/index.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/Detail/routes.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/ConfigMaps/Detail/shell.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/index.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/Detail/routes.test.ts
./node_modules/.bin/esno packages/console/src/pages/projects/containers/Secrets/Detail/shell.test.ts
```

- [x] **步骤 2：运行格式和差异检查**

```bash
./node_modules/.bin/prettier --check \
  packages/console/src/pages/projects/containers/ConfigMaps/index.tsx \
  packages/console/src/pages/projects/containers/ConfigMaps/index.test.ts \
  packages/console/src/pages/projects/containers/Secrets/index.tsx \
  packages/console/src/pages/projects/containers/Secrets/index.test.ts

git diff --check
```

- [x] **步骤 3：静态确认项目列表不再引用 V3 包装器**

```bash
rg -n 'ConsoleV3ResourceList|wujieUrlPrefix|WujieReact|wujie-react' \
  packages/console/src/pages/projects/containers/ConfigMaps \
  packages/console/src/pages/projects/containers/Secrets
```

预期：只允许历史测试或明确的详情注释中出现与迁移范围无关的内容；两个列表入口文件不得出现这些引用。

- [ ] **步骤 4：提交独立变更**

```bash
git add \
  packages/console/src/pages/projects/containers/ConfigMaps/index.tsx \
  packages/console/src/pages/projects/containers/ConfigMaps/index.test.ts \
  packages/console/src/pages/projects/containers/Secrets/index.tsx \
  packages/console/src/pages/projects/containers/Secrets/index.test.ts

git commit -m "feat: migrate project config lists to native pages"
```

浏览器验收需要在构建镜像、部署到授权的 131 环境并确认 rollout 成功后执行；本计划不把本地单测或构建成功当作最终验收。
