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
- StatefulSet `v4-watch-sts-20261022-01` 完成服务和设置保存回读验证：编辑服务保持原值确认时 namespace 作用域 PATCH 返回 200；编辑设置临时修改测试标签后 PUT、回读 200，再恢复原值并回读 200；StatefulSet 保持 `1/1`，Service 的 Headless、端口和 selector 保持一致；证据见 [`evidence/workload-statefulset-service-verify-20261025.json`](./evidence/workload-statefulset-service-verify-20261025.json)。
- Deployment `v4-deploy-edit-ef3` 的“编辑设置”页面在当前制品上完成保存回读验证：临时修改测试标签、通过 namespace 作用域 PUT 保存并回读 200，再恢复原值并回读 200；Deployment 全程保持 `1/1` Ready 并完成 rollout；证据见 [`evidence/workload-deployment-settings-verify-20261025.json`](./evidence/workload-deployment-settings-verify-20261025.json)。
- DaemonSet `v4-stop-ds-7fa` 完成设置保存回读验证：临时修改测试标签、通过 namespace 作用域 PUT 保存并回读 200，再恢复原值并回读 200；DaemonSet 全程保持 `1/1` Ready 并完成 rollout，页面未显示副本数量编辑，现有 nodeSelector 保持不变；证据见 [`evidence/workload-daemonset-settings-verify-20261025.json`](./evidence/workload-daemonset-settings-verify-20261025.json)。
- DaemonSet 停止成功路径已在当前制品补测：项目列表选择 `v4-stop-ds-7fa` 后点击“停止”，namespace 作用域 PATCH 返回 200，`non-existing=true` 后状态为 `0/0`，页面显示“已停止”。对照 `release-4.1.5` 完整源码和旧 V3 Store，基线同样只提供停止动作，没有产品层恢复入口；本轮通过已授权测试资源补丁移除临时 selector，完成夹具清理并恢复 `1/1`。证据见 [`evidence/workload-daemonset-stop-recovery-verify-20261025.json`](./evidence/workload-daemonset-stop-recovery-verify-20261025.json)。
- 当前部署制品补充了 Deployment 变更 Action：两个专用 Deployment 在原生项目列表执行批量删除，两个 namespace 作用域 DELETE 均返回 200，页面和 Kubernetes 均无残留；`v4-deploy-edit-ef3` 通过原生“编辑设置”将副本数 `1 → 2 → 1`，两次 PUT 返回 200，API 回读和 rollout 均成功并恢复 `1/1`。证据见 [`evidence/workload-action-mutation-verify-20261025.json`](./evidence/workload-action-mutation-verify-20261025.json)。
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
