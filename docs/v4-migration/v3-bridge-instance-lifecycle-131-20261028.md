# V3 共享实例跨布局生命周期 131 记录（2026-10-28）

## 现象

项目 V3 列表 → 集群 V3 页面 → 返回项目 V3 列表，项目列表空白约 4 秒后才出现数据。

## 测量

Playwright 1.63.0 headless Chromium，30881，`dev-wms`，SPA 内跳转（`pushState` + `popstate`），每 0.1～1 秒采样一次 ShadowRoot 表格行数。

| 路径                                      | 首次可见行 | 结果                          |
| ----------------------------------------- | ---------- | ----------------------------- |
| 项目 `/pods` → 集群 `/clusters/host/pods` | 0.3 s      | 复用，11 行                   |
| 集群 `/clusters/host/pods` → 项目 `/pods` | 4.0 s      | 空白 3 s 后重建，再启动约 1 s |
| 项目 `/pods` → 项目 `/services`           | 0.5 s      | 复用                          |
| 项目 `/services` → 项目 `/pods`           | 0.5 s      | 复用                          |

生命周期标记（`performance.mark` 前缀 `consolev3:`）显示返回项目列表时先 `deactivated`，约 3 秒后出现 `beforeMount` / `afterMount`，即实例被销毁后重建。

### 根因（埋点复测）

1. **返回必定重建**：`fetchRules()` 在每次进入布局时无条件调用 `clearResourceListRevisions()`，全局代次递增，`shouldRebuildConsoleV3Instance` 因此判定 `deactivated && mountedRevision !== revision`，返回项目列表时必然 `destroyApp('consolev3')` 冷启动。项目列表之间切换不经过布局，所以不受影响。
2. **共享 ShadowRoot 被清空**：非保活嵌入（集群等 V3-only 页，`sync={false}` 且不传 `alive`）激活时把 `sandbox.alive` 覆盖为 `false`，卸载时 Wujie 执行 `__WUJIE_UNMOUNT` 并 `clearChild(shadowRoot)`。项目列表随后只能空激活或就地重渲染。
3. **旧模板空壳遮挡内容**：非保活激活会追加第二个 `<html>` 模板，并把存活 head/body **移动**进去（`replaceHeadAndBody`），旧 `<html>` 变成空壳。空壳仍匹配 V3 全局样式（`html{height:100%}`），占满整屏，把真实内容顶到视口之外。实测从项目列表进入集群容器组时整页空白，表格首行 y=1052（视口高 900）。

## 已尝试且回退的方案

1. **缩短空 ShadowRoot 校验等待至 1 秒**（`eaf3e17e9`，回退 `42bcb2385`）

   校验提前到 1 秒执行，但重建后的 V3 应用启动占满剩余时间，用户可见空白仍约 4 秒，无收益。

2. **集群级嵌入改用 `ConsoleV3ResourceList`**（`91e05d689`，回退 `add8a4211`）

   把集群列表、集群标签、集群容器组三处嵌入改为共用宿主组件，期望保留实例。实测双向更差：进入集群容器组 0.3 s → 1.2 s，返回项目容器组仍 3 秒后 `beforeMount`。

3. **共享实例被清空时就地重渲染**（`e8b1c535d`）

   `startApp({alive:false})` 在存活 iframe 内重渲染，避免整包冷启动。返回项目列表从 4.0 s 缩短到 2.35 s，但仍不是复用；该路径保留为兜底。

## 本次修复

| 提交        | 内容                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ab8fc1ea2` | `fetchRules` 改为规则快照比较，仅规则真正变化时清空失效代次；监听共享 ShadowRoot，将 `sandbox.alive` 恢复为 `true`（非保活卸载走 deactivate），并清理不持有 body 的模板空壳 |
| `8e546908d` | 模板追加（即其他嵌入的非保活激活）后按 `sandbox.url` 触发一次 `replaceState` + `popstate`，把保活的子应用路由带到目标路由（**未生效**，见下）                               |
| `f27c26ee7` | 激活路由同步改为无条件派发 `popstate`，仅在路径不同时补 `replaceState`；保活项目列表的恢复逻辑保持原短路行为                                                                |
| `403af1ecc` | 没有子窗口句柄且 DOM 中没有已渲染实例时先 `destroyApp` 再挂载，按基线冷启动（`161dff607` → `e8bc9635e` 在 release 分支上收敛为 `c42a13b1c`）                                |

`packages/console/src/components/ConsoleV3ResourceList/keepAlive.ts` 承载生命周期守卫，`metrics.ts` 增加从 DOM 解析共享 sandbox 的入口。

## 修复后测量（`ab8fc1ea2` 已部署制品）

Playwright 1.63.0 headless Chromium，30881，`dev-wms`，SPA 内跳转，每 0.1 秒采样。

| 路径                                               | 首帧（100 ms）行数 | 生命周期标记                     | 模板数 |
| -------------------------------------------------- | ------------------ | -------------------------------- | ------ |
| 项目 `/pods` → 项目 `/services` → `/pods`          | 11                 | `activated@41`、`render@41`      | 1      |
| 项目 `/pods` → 集群 `/clusters/host/pods`          | 无空白帧           | 只有 `deactivated`（旧宿主卸载） | 1      |
| 集群 `/clusters/host/pods` → 项目 `/pods`          | 11                 | `activated@33`、`render@34`      | 1      |
| 项目 `/pods` → 项目 `/secrets`（V4 原生）→ `/pods` | 11                 | `activated`、`render`            | 1      |
| 连续 3 轮 项目 → 集群容器组 → 集群部署 → 项目      | 11                 | 无 `beforeMount`/`afterMount`    | 均为 1 |

- 返回项目列表全过程 `blankFrames=0`（40 次 100 ms 采样无空表），settle 后行内容与离开前一致。
- 集群容器组页面表格首行 y=256，在视口内（修复前 y=1052，整页空白）。
- 沙箱方法埋点：返回项目列表只有 `unmount(alive=true)` 与 `active`，无 `destroy`。
- 本节只验证了实例复用与布局，未验证列表内容是否跟随路由；`ab8fc1ea2` 上集群内路由切换仍显示旧列表，见下节。
- 控制台报错 `common is not defined` 在登录后即出现且与 V3 宿主数量无关（原生页面 `wujie-app` 数为 0），属既有环境/扩展问题，本次未改动。

### `ab8fc1ea2` 暴露的回归

保活后子应用不再重建 React 树，而非保活激活只通过 `history.replaceState` 写入子应用 URL，路由监听不到变化：从项目列表进入集群容器组后，再切到集群部署仍渲染容器组列表（列头为「节点 / 容器组 IP 地址」，子应用 URL 已是 `/consolev3/clusters/host/deployments`）。未经过项目列表的同一跳转（无保活）内容正确，确认由保活引入。

`8e546908d` 为此在模板追加时同步子应用路由，但**实测未生效**。埋点显示该次激活只留下 `popstate main` 与子应用 `replaceState … /clusters/host/deployments` 两条记录，子应用内没有 `popstate`：Wujie 已先用 `replaceState` 写入目标路径，`syncConsoleV3ListRoute` 的「路径相同则返回」短路跳过了事件派发，保活的子应用路由因此从未收到通知。

`f27c26ee7` 改为激活同步无条件派发一次 `popstate`（路径不同时才补 `replaceState`）。保活项目列表的激活仍走原 `scheduleConsoleV3ListRouteSync`，短路语义不变。

## 修复后测量（`f27c26ee7` 已部署制品）

Playwright 1.63.0 headless Chromium，30881，`dev-wms`，SPA 内跳转，每 100 ms 采样；同时记录 KAPI 请求。

同一脚本在 `8e546908d` 制品（部署前基线）与 `f27c26ee7` 制品上各跑一次，路径完全相同：

| 页面                                  | `8e546908d` 列头                            | `f27c26ee7` 列头           | `f27c26ee7` KAPI 请求     |
| ------------------------------------- | ------------------------------------------- | -------------------------- | ------------------------- |
| 集群容器组 `/clusters/host/pods`      | 节点 / 容器组 IP 地址                       | 节点 / 容器组 IP 地址      | `…/v1alpha3/pods`         |
| 集群部署 `/clusters/host/deployments` | 节点 / 容器组 IP 地址（**旧列表**，无请求） | 项目 / 更新时间            | `…/v1alpha3/deployments`  |
| 集群服务 `/clusters/host/services`    | 节点 / 容器组 IP 地址（**旧列表**，无请求） | 项目 / 内部访问 / 外部访问 | `…/v1alpha3/services`     |
| 有状态副本集 `/statefulsets`          | 节点 / 容器组 IP 地址（**旧列表**，无请求） | 状态 / 项目 / 创建时间     | `…/v1alpha3/statefulsets` |
| 守护进程集 `/daemonsets`              | 节点 / 容器组 IP 地址（**旧列表**，无请求） | 状态 / 项目 / 创建时间     | `…/v1alpha3/daemonsets`   |

返回项目容器组（同一脚本末步）：

| 制品        | 首行数据   | 空白帧                         | 模板数 / alive | 生命周期标记                      |
| ----------- | ---------- | ------------------------------ | -------------- | --------------------------------- |
| `8e546908d` | 108 ms     | 0                              | 1 / true       | `activated`、`render`             |
| `f27c26ee7` | 1.5～1.8 s | 无整页空白，内容区为加载指示器 | 1 / true       | `activated@14965`、`render@14966` |

`8e546908d` 的 108 ms 来自**旧列表残留**（上一屏是集群守护进程集，但其内容仍是容器组列表），不代表真实切换。

### 返回项目的 1.7 s 归属

同一次返回共发出 13 个 KAPI 请求，其中 `resources.kubesphere.io/v1alpha3/customresourcedefinitions` 耗时 1212 ms；子应用路由已正确切到 `/consolev3/<project>/pods`，`sandbox.alive=true`，`childCount=1`。

在**独立 V3 控制台**（30880，同一份 V3 应用，无 Wujie 桥接）复测同样路由：

| 跳转                    | 独立 V3 首行 | 桥接内首行   |
| ----------------------- | ------------ | ------------ |
| 项目容器组 → 集群容器组 | 1355 ms      | 368 / 446 ms |
| 集群容器组 → 集群部署   | 191 ms       | 320 ms       |
| 集群部署 → 项目容器组   | 1468 ms      | 1726 ms      |

独立 V3 同样受 `customresourcedefinitions`（1250～1466 ms）拖慢。进入集群页桥接内比独立控制台更快（复用实例，368/446 ms 对 1355 ms）；返回项目时 ProjectLayout 重新引导是 V3 应用自身的跨布局开销，桥接内与独立控制台处于同一量级，不再出现实例销毁、ShadowRoot 清空或整页空白。

### 直连集群页后进入项目列表（冷启动交接）

不经项目列表、直接打开集群页时，共享实例由非保活的集群嵌入创建，其卸载清空 ShadowRoot，`ConsoleV3ResourceList` 也没有子窗口句柄。此时 alive 挂载只会激活空壳，内容要等 3 秒校验后走就地重渲染：

Playwright 1.63.0 headless Chromium，30881，`dev-wms`，首次进入 `/clusters/host/pods`（整页加载 9 秒）后再 SPA 跳转 `/dev-workspace/clusters/host/projects/dev-wms/pods`：

| 时间（跳转后） | `wujie-app` 数 | 模板数 | 首行 | 说明                                        |
| -------------- | -------------- | ------ | ---- | ------------------------------------------- |
| 0.3 s          | 0              | -      | -    | 旧宿主已卸载                                |
| 0.8～6.9 s     | 1              | 0      | 0    | 空壳（`activated` 已触发，但 ShadowRoot 空） |
| 7.5 s          | 1              | 1      | 0    | 就地重渲染完成（`beforeMount`/`afterMount`） |
| 9.1～11.0 s    | 1              | 1      | 9    | 出首行                                     |

同一脚本在 release 制品（`7c308ad90`）上首行为 11.0 s，重新跑一次 9.1 s。基线（`fc1253cbe`）在同一路径上是「首次使用即 `destroyApp` + 冷启动」约 4 秒，因此这是保活改造引入的退化：空壳实例被当成可用实例。

`161dff607` 在没有子窗口句柄且 DOM 中没有已渲染实例时按基线处理（先 `destroyApp` 再挂载），stale 场景仍走就地重渲染。

两种做法的实测对比（release 制品，同一脚本）：

| 做法 | 首行 | 备注 |
| --- | --- | --- |
| 无子窗口句柄时 `destroyApp` + 冷启动（最终采用） | 3981～4437 ms | 销毁仍存活的 sandbox 时 wujie 内部异步收尾打印一条 `Cannot read properties of null (reading '_cacheListeners')`，渲染正常 |
| 无子窗口句柄时 `reviveConsoleV3Instance` 就地重渲染 | 9730 ms | 需要 6.5 秒在已有 iframe 内重新执行应用，反而更慢，已回退 |
| 不处理（`7c308ad` 行为） | 9066～11014 ms | 空壳激活 + 3 秒校验 + 就地重渲染 |

### 详情页嵌入

集群容器组 → 集群容器组详情（`/clusters/host/projects/dev-wms/pods/:name`，原始 `WujieReact`、`sync={false}`、无 `alive`）：子应用路由带 V4 追加的 `/resource-status`，拉取到 `/api/v1/namespaces/dev-wms/pods/:name`，`alive=true`、模板数 1；返回项目容器组首行 1917 ms，无重建。

### 连续多轮跳转

项目 → 集群容器组 → 集群部署 → 项目，连续 3 轮，每轮 100 ms 采样 30 次：`childCount` 恒为 1，`alive=true`，内容区无整页空白帧（返回项目时为加载指示器转 1.4～2.1 s 后出表），无 `beforeMount` / `afterMount` 重建标记。

## 当前部署状态

| 项                 | 值                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 分支               | `fix/v4-v3-bridge-sync`                                                                                            |
| HEAD               | `f27c26ee7`                                                                                                        |
| GitHub Actions Run | `40632252518`（Unit tests + Build 均 success）                                                                     |
| 镜像               | `ghcr.io/mysstack/ks-console:fix-v4-v3-bridge-sync-20261028-122652-f27c26ee7846`                                   |
| Deployment         | `kubesphere-system/ks-console-v415-rea`，generation 16                                                             |
| Pod / imageID      | `ks-console-v415-rea-6f8b66ccc9-w94q7` / `sha256:cc3c1da4290d35f630cb12708d02df840b4b391538d6477de41a6dd599795e5a` |

更早的制品：`8e546908d`（Run `40631047785`，generation 15，Pod `ks-console-v415-rea-55c87466d7-6nb9d`，imageID `sha256:86ea8cb8d0fbb5f35cd163e6965cb9e984171c177029963c30335dbbfbec6487`），`ab8fc1ea2`（Run `40629370511`，generation 14，Pod `ks-console-v415-rea-5b6587f5cd-sn542`，imageID `sha256:d5690d04f30c01ad699e00f72435bbbf384abfc10dfa3bd1db816bfd2928ca07`）。

早期制品 `add8a4211`（Run `40619532066`）、`e8b1c535d`（Run `40627379325`）、`eaf3e17e9`（Run `40617781717`）、`91e05d689`（Run `40618573666`）均已被取代。

## 未验证

- 工作空间、平台、联邦项目等其他非保活嵌入页在保活守卫下的路由同步；本次只验收集群容器组 / 部署 / 服务 / 有状态副本集 / 守护进程集。
- 资源变更（`invalidateResourceList`）触发重建的浏览器验收；本次只覆盖单元测试与规则快照逻辑。
- 其他命名空间、非 admin 账号；集群页直连 URL（首次加载即进入集群页）未单测。
- `common is not defined` 报错来源（既有环境问题，登录后即出现，未定位到具体扩展）。
