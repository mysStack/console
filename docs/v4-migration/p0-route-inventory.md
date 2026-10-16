# P0-Audit V3 路由入口库存

> 取证日期：2026-10-17（上海时间）
> 分支：`feature/v4-p0-audit`
> 基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`
> 目的：把源码中的 V3 URL 入口按作用域分组，作为后续 131 运行时入口核对的候选清单。

## 1. 统计口径

以下命令只扫描 `packages/console/src` 和 `packages/shared/src`，排除测试和 source map。计数单位是“包含匹配文本的文件数”，一个文件可能包含多个 URL，也不代表路由注册数量：

```bash
rg -l 'consolev3' packages/console/src packages/shared/src \
  --glob '!**/*.test.*' | wc -l
rg -l 'consolev3/clusters/' packages/console/src \
  --glob '!**/*.test.*' | wc -l
rg -l 'consolev3/workspaces/' packages/console/src \
  --glob '!**/*.test.*' | wc -l
rg -l 'consolev3/.+federatedprojects' packages/console/src \
  --glob '!**/*.test.*' | wc -l
rg -l 'consolev3/settings/' packages/console/src \
  --glob '!**/*.test.*' | wc -l
rg -l 'wujieUrlPrefix' packages/console/src/pages/projects packages/shared/src \
  --glob '!**/*.test.*' | wc -l
```

结果：

| 作用域/入口 | 文件数 | 典型 URL 模板或机制 |
| --- | ---: | --- |
| 全部 `consolev3` URL | 118 | 绝对 URL、路由转换或 Wujie Embed |
| 集群 | 45 | `/consolev3/clusters/:cluster/...` |
| Workspace | 5 | `/consolev3/workspaces/:workspace/...` |
| 联邦项目 | 23 | `/consolev3/:workspace/federatedprojects/:namespace/...` |
| 平台设置 | 9 | `/consolev3/settings/...` |
| 项目 `wujieUrlPrefix` | 50 | 由项目布局注入的相对 V3 资源路径 |

上述分类存在交叉，不能相加得到总路由数。

## 2. 入口分类

### 项目作用域

项目布局通过 `wujieUrlPrefix` 给 V3 资源列表和详情拼接相对路径。已确认的资源候选包括：

```text
deployments, statefulsets, daemonsets, jobs, cronjobs, pods,
services, ingresses, gateways, volumes, volume-snapshots,
networkpolicies, alert-rules, alerts, roles, log-collections,
s2ibuilders, grayrelease, composing, configurations,
microservices, microservicegateways, microservice-instances,
servicerouting, custom-monitoring, base-info
```

代表性源码：

- `packages/console/src/pages/projects/containers/Deployments/index.tsx`
- `packages/console/src/pages/projects/containers/Services/index.tsx`
- `packages/console/src/pages/projects/containers/Volumes/index.tsx`
- `packages/console/src/pages/projects/containers/Pods/index.tsx`
- `packages/console/src/pages/projects/containers/Base/BaseLayout/index.tsx`

这些是源码消费者候选，是否在目标环境启用、对应菜单权限和实际 API 行为仍需 131 运行时证据。

### 集群作用域

集群 Embed 直接拼接绝对 URL，已确认的路径族包括：

- 工作负载：`/clusters/:cluster/{deployments,statefulsets,daemonsets,jobs,cronjobs,pods}`；
- 网络：`/clusters/:cluster/{ingresses,services,networkpolicies,ippools,clusteringresssettings}`；
- 存储：`/clusters/:cluster/{volumes,storageclasses,volume-snapshot-classes,volume-snapshots,pv}`；
- 配置和平台：`/clusters/:cluster/{configmaps,secrets,edgenodes,custom-monitoring,log-collections,gateways}`；
- 项目详情：`/clusters/:cluster/projects/:namespace/...` 下的 Pod、Service、Ingress、NetworkPolicy、Volume 和 Gateway 详情。

代表性源码：

- `packages/console/src/pages/clusters/containers/Workload/Deployments/Embed.tsx`
- `packages/console/src/pages/clusters/containers/Configuration/Configmaps/Embed.tsx`
- `packages/console/src/pages/clusters/containers/Configuration/Secrets/Embed.tsx`
- `packages/console/src/pages/clusters/containers/Storage/Volumes/Embed.tsx`
- `packages/console/src/pages/clusters/containers/Network/Policies/Embed.tsx`

### Workspace、联邦和平台

- Workspace 入口包含概览、集群、联邦项目、Gateway、Quota 和 Groups；
- 联邦项目入口包含 Application、ConfigMap、Secret、Deployment、Service、Ingress、StatefulSet、Volume、Gateway、Quota 和 LogCollection；
- 平台设置入口包含 Notification、Subscription、Silent Policy、History 等页面。

代表性源码：

- `packages/console/src/pages/workspaces/containers/FedProjects/index.tsx`
- `packages/console/src/pages/workspaces/containers/Overview/Clusters/embed.tsx`
- `packages/console/src/pages/fedprojects/containers/ConfigMaps/index.tsx`
- `packages/console/src/pages/fedprojects/containers/Secrets/index.tsx`
- `packages/console/src/pages/platform/containers/NotificationConfiguration/embed.tsx`

## 3. 动态入口和未解析项

- `packages/console/src/pages/devops/embed.tsx` 和 `packages/console/src/pages/whizard-telemetry/embed.tsx` 使用当前 location 拼接 `/consolev3`，静态文本无法枚举所有运行时路径；
- `packages/console/src/pages/clusters/containers/ApplicationWorkloads/Jobs/Embed/index.tsx`、`Workload/Workloads/Embed/index.tsx` 和 Alerting Embed 使用 `tab` 或 `path` 变量，必须从路由注册和菜单配置补全实际取值；
- `packages/console/src/components/ConsoleV3ResourceList/route.ts`、`packages/console/src/pages/projects/containers/Base/BaseLayout/route.ts` 负责 V4 与 V3 路径转换，不能只按 URL 字符串判断启用状态；
- `packages/console/src/actions/v3actions.tsx` 和 `packages/shared/src/hooks/useV3Actions/index.tsx` 负责动态 Action，需结合按钮权限、弹窗参数和 Network 记录核对；
- `packages/shared/src/components/ExtensionConsoleV3Embed/` 的 5 个引用文件只能证明扩展嵌入消费者存在，不能证明当前扩展清单中全部启用。

## 4. 下一步核对清单

1. 从 `packages/console/src/routes/index.tsx` 及各作用域 `routes` 文件导出实际注册路径；
2. 将注册路径与本清单的 V3 URL 模板去重，标注列表、详情、操作和重定向；
3. 在指定 131 制品上逐项记录菜单显示、直达、刷新、返回、权限和 Network；
4. 将每个仍被启用的 V3 入口回链到 V4 替代文件或明确列入后续迁移任务。

本清单只关闭了 P0-U002 的静态盘点部分；启用状态、运行时行为和动态 Action 仍未关闭，不能据此宣布 P0-REA 通过。
