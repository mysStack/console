# V3 / Wujie 依赖清单

> 事实检查日期：2026-10-16；文档复核日期：2026-10-17
> 仓库：`mysStack/console`  
> 分支：`feature/v4-migration`  
> 基线提交：`fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`

这是 P0-REA 阶段的静态依赖清单，记录源码和构建配置中的 V3/Wujie 引用。它不代表每个引用都一定会在当前部署中被访问，也不代表 P0-REA 已通过。第一轮 `v3dist` REA 的 Evidence ID、覆盖范围和限制见[REA 阶段分析总结](./rea-analysis-summary.md)。删除依赖前，必须在 131 测试环境使用部署后的制品和 Playwright 确认运行时行为。

## 扫描命令

以下命令在仓库根目录执行，扫描时排除了 `node_modules` 和已编译的 V3 资源目录：

```bash
rg -l --hidden --glob '!.git/**' --glob '!node_modules/**' \
  --glob '!packages/bootstrap/assets/v3dist/**' \
  'wujie-react|WujieReact' packages extensions scripts package.json yarn.lock

rg -l --hidden --glob '!.git/**' --glob '!node_modules/**' \
  'ConsoleV3ResourceList|ExtensionConsoleV3Embed|useV3action|useV3Actions|/consolev3|consolev3/' \
  packages extensions scripts package.json yarn.lock
```

## 静态扫描结果

| 引用类型                                    | 文件数 | 说明                                                |
| ------------------------------------------- | -----: | --------------------------------------------------- |
| 直接 `wujie-react` 引用或 `WujieReact` 符号 |    122 | 页面组件、生命周期工具、Action 桥接、测试和构建引用 |
| `ConsoleV3ResourceList`                     |     28 | 项目资源的 V3 列表包装器及其调用方                  |
| `ExtensionConsoleV3Embed`                   |      5 | 扩展模块使用的 V3 嵌入组件、导出和类型              |
| `useV3action` / `useV3Actions`              |     14 | 动态 V3 Action 弹窗和桥接调用方                     |
| `/consolev3` 或 `consolev3/` 字符串         |     99 | 路由、URL 构造器、路由测试和运行时工具              |
| `v3dist` 构建引用                           |      2 | Webpack/资源构建配置；编译产物单独保留              |

这些数字存在交集。例如一个 Deployment 详情文件可以同时包含 Wujie 组件和 V3 路由地址。

## 2026-10-18 当前分支复核

在 `feature/v4-configmaps-secrets` 当前工作树重新执行上面的扫描命令，仍排除
`node_modules` 和 `packages/bootstrap/assets/v3dist`。本次结果如下：

| 引用类型                       | 当前文件数 | 说明                                                                                     |
| ------------------------------ | ---------: | ---------------------------------------------------------------------------------------- |
| `wujie-react` / `WujieReact`   |        133 | 包含构建配置、测试文件和现有 `packages/shared/lib` 编译输出；不能直接视为 133 个启用页面 |
| `ConsoleV3ResourceList`        |         28 | 与首轮结果一致                                                                           |
| `ExtensionConsoleV3Embed`      |         17 | 包含源码、导出、类型和现有编译输出；当前启用扩展数量仍需运行时清单确认                   |
| `useV3action` / `useV3Actions` |         14 | 与业务调用文件和桥接文件的静态盘点一致                                                   |
| `/consolev3` 或 `consolev3/`   |        101 | 路由、测试、工具和编译输出均可能命中                                                     |

复核命令仍是文件级统计，结果存在交集，不能替代菜单启用状态、Network、API RBAC 或浏览器功能等价性证据。当前只更新静态取证范围，未因数字变化关闭任何 V3/Wujie 迁移项。

## 2026-10-20 活动源码口径复核

为区分历史编译输出、旧兼容文件和当前活动路由，本轮在 `packages/console/src`、`packages/core/src`、`packages/shared/src` 中排除测试文件后重新统计：

| 引用类型                       | 当前源码文件数 | 说明                                                                    |
| ------------------------------ | -------------: | ----------------------------------------------------------------------- |
| `useV3action` / `useV3Actions` |             11 | 8 个业务调用文件、2 个桥接实现/Hook 文件、1 个导出文件                  |
| `WujieReact`                   |            117 | 当前源码仍有活动 Embed、兼容残留和扩展入口，不能直接视为 117 个启用页面 |
| `consolev3`                    |            121 | URL、Wujie 工具、路由转换和桥接实现的文件级命中                         |

当前项目 Deployment、StatefulSet、DaemonSet 活动详情路由已由 `projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/*/Detail/routes.tsx`；旧 `projects/containers/*/Detail` 文件仍被静态扫描命中，但不在该活动导入链上。历史 P0 统计保留作为历史证据，本节数字用于当前分支的活动源码复核，不代表全仓库 V3/Wujie 已移除。

## 运行时入口

| 入口                                                                | 源码证据                                                     | 当前作用                             | 迁移状态                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------ | ---------------------------- |
| `packages/console/src/components/ConsoleV3ResourceList/index.tsx`   | 引入 `wujie-react`，创建 `consolev3` 应用并调用 `destroyApp` | 项目资源的持久化 V3 列表容器         | 仅完成盘点；需按资源替换     |
| `packages/console/src/actions/v3actions.tsx`                        | 引入 `wujie-react`，发送 `triggerAction` 并渲染 V3 弹窗      | 动态编辑和配置 Action                | 仅完成盘点；需按 Action 替换 |
| `packages/shared/src/components/ExtensionConsoleV3Embed/`           | Wujie 包装器和公共导出                                       | 扩展模块提供的 V3 页面               | 仅完成盘点；需要 V4 扩展契约 |
| `packages/shared/src/hooks/useV3Actions/index.tsx`                  | 发送 `triggerAction`，打开 `/consolev3/dashboard`            | 应用和工作负载详情共用的 Action Hook | 仅完成盘点                   |
| `packages/core/src/utils/wujie.ts`                                  | `setupApp`、`preloadApp`、事件总线和 `/consolev3` URL        | 宿主初始化、预加载和生命周期管理     | 仅完成盘点                   |
| `packages/core/src/components/Layouts/BaseLayout/index.tsx`         | `bus.$emit/$on/$off` 和 V3 通知/路由事件                     | 宿主与子应用事件桥                   | 仅完成盘点                   |
| `packages/shared/src/components/ProjectLayout/ListLayout/index.tsx` | 创建 `wujieUrlPrefix`                                        | 项目范围的 V3 URL 前缀               | 仅完成盘点                   |

## 项目资源列表调用方

当前基线中仍通过 `ConsoleV3ResourceList` 加载的项目资源包括：

```text
alert-rules、alerts、composing、configmaps、configurations、cronjobs、
daemonsets、deployments、gateways、grayrelease、ingresses、jobs、
log-collections、microservicegateways、microservices、networkpolicies、
pods、roles、s2ibuilders、secrets、serviceaccounts、servicerouting、
services、statefulsets、volume-snapshots、volumes
```

代表性调用方：

- `packages/console/src/pages/projects/containers/ConfigMaps/index.tsx`
- `packages/console/src/pages/projects/containers/Secrets/index.tsx`
- `packages/console/src/pages/projects/containers/Deployments/index.tsx`
- `packages/console/src/pages/projects/containers/StatefulSets/index.tsx`
- `packages/console/src/pages/projects/containers/DaemonSets/index.tsx`
- `packages/console/src/pages/projects/containers/Pods/index.tsx`
- `packages/console/src/pages/projects/containers/Services/index.tsx`
- `packages/console/src/pages/projects/containers/Routes/index.tsx`
- `packages/console/src/pages/projects/containers/Volumes/index.tsx`
- `packages/console/src/pages/projects/containers/VolumeSnapshots/index.tsx`

## 已存在的 V4 原生代码

以下代码可以复用，但必须先完成行为和浏览器验证：

- 集群工作负载列表：`packages/console/src/pages/clusters/containers/ApplicationWorkloads/Workloads/index.tsx`
- 集群工作负载详情和操作：`packages/console/src/pages/clusters/containers/Workload/Deployments/`
- 项目工作负载详情外壳（当前仍有 V3 桥接）：`packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/`
- 项目 ConfigMap 详情：`packages/console/src/pages/projects/containers/ConfigMaps/Detail/`
- 项目 Secret 详情：`packages/console/src/pages/projects/containers/Secrets/Detail/`
- 配置历史：`packages/console/src/pages/projects/components/ConfigHistory/`
- 工作负载配置引用：`packages/console/src/pages/projects/components/ConfigReference/`
- 工作负载 API/Store：`packages/shared/src/stores/workload/index.ts`

## 构建和依赖引用

- `packages/console/package.json`、`packages/core/package.json` 和 `packages/shared/package.json` 都声明了 `wujie-react`。
- `packages/bootstrap/assets/v3dist/` 保存编译后的 V3 Chunk 和静态资源。在所有运行时用户迁移并通过部署验证前，不得删除。
- `packages/bootstrap/webpack/config.js`、`webpack.dll.conf.js`、`webpack.extension.conf.js`、`webpack.base.conf.js` 以及 `packages/bootstrap/cli/webpack.js` 包含 V3 资源或构建引用。

## 证据状态

| 证据                   | 状态       | 下一步                                                      |
| ---------------------- | ---------- | ----------------------------------------------------------- |
| 源码静态扫描           | **已验证** | 每个迁移 PR 后重新扫描并更新清单                            |
| 当前分支和基线 SHA     | **已验证** | 后续记录使用 SHA，不再引用已删除的 `feature/config-history` |
| 131 环境运行时 Network | 待实测     | 部署带 tag 的镜像，逐个模块采集脱敏请求                     |
| V3 Action/菜单完整性   | 待实测     | 完成 Deployment 证据包，逐项对照菜单、弹窗和 RBAC           |
| 扩展模块 V4 契约       | 未确认     | 盘点当前启用扩展，再删除公共 V3 包装器                      |

## P0-REA 晋级条件

- [ ] 当前部署启用的路由、扩展、V3/Wujie 入口和动态 Action 均有来源定位和责任人。
- [ ] 旧 V3 源码来源或“仅有编译产物”的边界已固定，并记录 tag/commit、许可证和制品摘要。
- [ ] 131 运行时 Network、路由和菜单行为已按部署制品核对；静态引用数量与运行时使用范围的差异已记录。
- [ ] 高风险未知项有关闭证据、明确的阻塞状态或经复核的范围排除。
