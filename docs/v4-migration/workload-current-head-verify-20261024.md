# Workload 当前制品 VERIFY 记录（2026-10-24）

## 1. 本轮边界

本轮验证对象是 `feature/v4-workloads` 的代码提交 `54b863b2ccd611bab088d39bcbebc8b4e9f68500` 对应制品。REA 主基线采用 `release-4.1.5` 完整前端源码和同版本已部署页面；旧 `v3dist` 只用于制品校准，`origin/release-3.4` 只在当前版本无法解释时补充参考。

本轮不修改稳定分支、集成分支或非测试业务资源，不把历史 SHA 的浏览器结果继承为当前制品通过。

## 2. 构建与部署证据

| 项目              | 结果                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------- |
| 分支 / 代码提交   | `feature/v4-workloads` / `54b863b2ccd611bab088d39bcbebc8b4e9f68500`                                   |
| CI                | Run `40100881163`；Unit tests 与 Build and publish 成功                                               |
| 镜像              | `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261024-220602-54b863b2ccd6`                       |
| 镜像 digest       | `sha256:53299da2a0add86f3c08208b8ed9728d39af31ae5c0ba7b315283dc5bfdc675a`                             |
| 集群 / Deployment | context `default`；`kubesphere-system/ks-console`；NodePort `30880`                                   |
| rollout           | 成功，副本 `1/1`，Pod Ready                                                                           |
| 实际 Pod          | `ks-console-7c987bf54b-4gjkz`                                                                         |
| Pod imageID       | `ghcr.io/mysstack/ks-console@sha256:53299da2a0add86f3c08208b8ed9728d39af31ae5c0ba7b315283dc5bfdc675a` |

本地 `corepack yarn build:packages`、`./scripts/test.sh`、相关定向测试和 `git diff --check` 已完成；本地完整 webpack 构建在加载 `NODE_OPTIONS=--openssl-legacy-provider` 后成功。首次未设置该兼容参数时的 OpenSSL 错误属于本地 Node 运行环境，不是本轮代码构建失败。

## 3. 浏览器复验结果

复验工具为 Playwright CLI。使用已建立的 30880 测试会话在 rollout 后重新加载页面，确认页面显示 `platform-admin`。本轮新建零 Cookie 会话并按 `/home/bruce/.bashrc` 环境变量登录时，登录接口返回业务错误，因此新登录链路标记为未通过；已认证会话的结果只作为页面与请求复验，不替代登录门禁。

### 已通过的当前制品场景

- 项目级 Deployment、StatefulSet、DaemonSet 列表均渲染原生 Workload 页面，并只显示 `v4-migration-e2e` namespace 的资源。
- 三类资源详情页完成直达与渲染检查；StatefulSet 详情页显示 1/1 资源状态，Deployment、StatefulSet 和 DaemonSet 的原生编辑设置入口均已打开并完成取消路径复验。
- Deployment 和 StatefulSet 的原生“编辑设置”显示更新策略、容器组、存储、调度、优雅终止和元数据分区；StatefulSet 额外显示副本分组序号和 PVC 模板；取消路径通过。
- DaemonSet 的原生“编辑设置”不显示副本数，显示其更新策略和就绪时间字段；取消路径通过。
- 集群级 `/clusters/host/deployments` 渲染原生列表，并显示“全部项目”筛选入口；该入口结果不能推断为项目 namespace 过滤结果。
- 配置引用页面原生显示 ConfigMap/Secret 名称、前缀和键名，Secret 值不出现在页面；相关 API 请求返回 200。
- StatefulSet `v4-watch-sts-20261022-01` 的“编辑服务”页面在当前制品上完成一次保持原值的确认操作，namespace 作用域 PATCH 返回 200，随后 StatefulSet 回读返回 200，Kubernetes Service 的 Headless、端口和 selector 保持一致；证据见 [`evidence/workload-statefulset-service-verify-20261025.json`](./evidence/workload-statefulset-service-verify-20261025.json)。
- 本轮 Workload 页面请求未发现 `/consolev3`、`/dist/v3dist` 或 Wujie 入口请求。
- 列表、详情、编辑设置和配置引用完成 DOM 快照，编辑设置完成截图检查。

### 低权限浏览器结果

- 专用低权限账号在当前制品上完成全新登录。
- 进入 `v4-migration-e2e` 项目 Deployment 列表返回 200，资源列表可见，页面未显示创建入口。
- 直接访问 ConfigMap 页面返回 403；这与 Kubernetes `auth can-i` 对 ConfigMap 的读权限结果不一致，说明 Console 权限键或 KubeSphere role template 仍需定位。
- 该结果只证明一条 Workload 读路径和一条拒绝路径，不能替代完整低权限 RBAC、配置引用和三类资源操作矩阵。

### 低权限配置引用复验

低权限账号在当前制品上打开 Deployment 配置引用页面成功。ConfigMap、Secret 列表和详情均使用 `v4-migration-e2e` namespace 路径并返回 200，页面不展示 Secret 值，未修改资源。独立 ConfigMap 列表页面仍发起缺少 namespace 的集群级请求并返回 403；该问题已登记为配置资源与共享列表底座依赖，不作为本轮 Workload 分支的业务代码修改。

### 尚未闭环的场景

- 当前制品的新 Cookie 登录链路未通过，必须重新建立可复现的专用测试会话后，才能完成完整浏览器验收。
- Deployment、StatefulSet、DaemonSet 的全部 Action 矩阵，以及保存、删除、回滚、重启、伸缩、冲突和网络错误路径尚未在本轮当前制品全部闭环。
- 低权限 RBAC、完整 namespace 正反隔离和缓存失效需要在当前制品上重新执行；历史证据不继承。
- 扩展初始化错误仍按负责人决定暂不纳入 Workload 模块验收，但不能写成控制台零错误。

## 4. 阶段结论

当前制品已完成构建、推送、部署、rollout、Pod digest 核对和部分浏览器页面复验，Workload 保持 `VERIFY / 进行中`。本记录不批准模块进入 PR，不标记 Deployment、StatefulSet 或 DaemonSet 已验收。

结构化证据：[workload-current-head-verify-20261024.json](./evidence/workload-current-head-verify-20261024.json)。
