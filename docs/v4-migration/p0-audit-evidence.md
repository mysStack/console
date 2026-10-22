# P0-Audit 静态盘点证据

> 取证日期：2026-10-17（上海时间）
> 任务分支：`feature/v4-p0-audit`
> 取证基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`
> 本文只记录事实和待核验项，不代表 P0 门禁通过，也不授权 P1/P2 开发。

## 1. 工作区和范围

```text
Worktree: /home/bruce/code/ks-develop/console-p0-audit
Branch:   feature/v4-p0-audit
HEAD:     3e09afd6a051d4091b3c887462c880eff2ba6754
Status:   clean（取证前）
```

本轮只读取当前 V4 迁移基线的源码、依赖、路由和构建入口。没有修改功能代码、没有删除 V3 制品、没有部署，也没有访问生产环境。

## 2. 静态引用计数

使用以下命令排除 V3 编译制品和 source map 后统计源码引用文件：

```bash
rg -l --glob '!packages/bootstrap/assets/v3dist/**' --glob '!**/*.map' \
  'WujieReact|ConsoleV3ResourceList|ExtensionConsoleV3Embed|useV3action|/consolev3|v3dist' \
  packages scripts config .github package.json
```

结果如下。计数单位是“包含匹配文本的文件数”，不是运行时路由数，不能直接当作迁移模块数量：

| 关键词                    | 文件数 | 解释                         |
| ------------------------- | -----: | ---------------------------- |
| `WujieReact`              |    124 | V3 微前端挂载或嵌入入口候选  |
| `ConsoleV3ResourceList`   |     28 | 复用 V3 资源列表的页面候选   |
| `ExtensionConsoleV3Embed` |      5 | 扩展嵌入组件引用             |
| `useV3action`             |     14 | V3 动态 Action 调用候选      |
| `/consolev3`              |     98 | V3 路由字符串或路由转换逻辑  |
| `v3dist`                  |      3 | 编译制品复制、删除或目录引用 |

在 `packages/console/src/pages` 下使用以下命令得到 429 个包含相关匹配的页面文件：

```bash
rg -l 'WujieReact|ConsoleV3ResourceList|ExtensionConsoleV3Embed|useV3action|/consolev3' \
  packages/console/src/pages | wc -l
```

429 是宽口径引用库存，不等于 429 条启用路由；需要结合路由注册、权限、菜单和运行时 Network 证据去重和核对。

## 3. 重点入口和构建边界

静态扫描定位到的代表性入口包括：

- `packages/console/src/actions/v3actions.tsx`：V3 Action 适配入口；
- `packages/console/src/components/ConsoleV3ResourceList/index.tsx`：V3 资源列表封装；
- `packages/shared/src/components/ExtensionConsoleV3Embed/`：扩展嵌入封装；
- `packages/shared/src/hooks/useV3Actions/index.tsx`：V3 Action Hook；
- `packages/core/src/utils/wujie.ts`：Wujie 相关工具；
- `packages/console/src/pages/projects/`、`clusters/`、`workspaces/`、`fedprojects/` 和 `platform/` 下的页面嵌入和路由转换代码。

依赖和构建入口核验结果：

- `packages/shared/package.json`、`packages/console/package.json`、`packages/core/package.json` 均声明 `wujie-react` `^1.0.22`；
- 根 `package.json` 使用 `extensions/*`，扩展目录实际位于 `packages/bootstrap/extension`；
- `.github/workflows/v3dist-delete.yml` 包含删除 `packages/bootstrap/assets/v3dist` 的流程；
- `packages/bootstrap/webpack/webpack.base.conf.js` 将 `assetsPath/v3dist` 复制到构建输出的 `dist/v3dist`。

这些事实说明 V3 依赖不只存在于页面组件，也存在于共享 Hook、扩展和制品构建链路。删除或替换前必须逐项核验消费者和回滚边界。

## 4. 已确认、推断和未知

### 已确认

1. 当前迁移基线仍保留 Wujie、V3 ResourceList、V3 Action、`/consolev3` 路由和 `v3dist` 构建引用。
2. ConfigMap/Secret 的当前源码测试已对部分 V3 依赖作出“不应存在”的断言，但这只覆盖对应模块，不能推断全仓库已完成原生化。
3. `v3dist` 会进入 Bootstrap 构建输出，不能只删除页面引用而不核验构建链路。

### 静态推断

- 上述引用文件是 P0 迁移盘点候选，需要按实际启用路由和权限进一步分组；
- `useV3action` 和 `WujieReact` 的存在只能证明代码路径存在，不能证明每条路径在目标环境一定被访问。

### 未知项和关闭条件

| ID        | 未知项                                      | 影响 | 关闭条件                                           |
| --------- | ------------------------------------------- | ---- | -------------------------------------------------- |
| P0-U002-A | 429 个页面引用中哪些是当前启用入口          | 高   | 从路由注册、菜单/权限和 131 运行时入口建立去重清单 |
| P0-U002-B | 各 V3 Action 的触发菜单、参数和替代 V4 行为 | 高   | 逐项建立 Action、API、权限、错误态和替代实现矩阵   |
| P0-U002-C | 扩展嵌入是否仍被已启用扩展消费              | 中高 | 枚举扩展清单并在目标制品和运行时核对加载结果       |
| P0-U002-D | 删除 `v3dist` 对构建、部署和回滚的影响      | 高   | 完成构建制品对照、部署 rollout 和已部署制品验收    |

## 5. 2026-10-20 当前活动路由复核补充

本文件首轮统计基于 P0 取证分支，不能覆盖后续模块提交。当前 `feature/v4-configmaps-secrets` 重新核对发现，项目 Deployment、StatefulSet、DaemonSet 详情的活动路由已由 `packages/console/src/pages/projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/*/Detail/routes.tsx`；旧 `projects/containers/*/Detail` 文件仍保留 Wujie 代码，但未被该活动路由文件导入。

因此，历史 `useV3action` 文件数和业务调用数只能作为基线快照；当前分支非测试源码的活动动态 Action 统计为 11 个文件、8 个业务调用文件和 9 个业务 Action 行。该补充只修正统计和活动路由归属，不关闭 P0-U002/P0-U003，也不授权删除兼容残留。

## 5. 门禁结论

P0-Audit 已形成第一轮静态证据，并由协调 Agent 在 [P0 131 运行时证据](./p0-runtime-evidence.md) 中补充了代表性菜单、Wujie frame、直达/刷新/返回、Network 和扩展状态。任务仍处于“进行中/待统一复核”，不能宣布 P0 通过；全量启用入口、权限和动态 Action 逐项映射仍需继续，且在指定复核人确认前不进入 P1/P2 正式开发。
