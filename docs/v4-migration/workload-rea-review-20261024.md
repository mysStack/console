# Workload 组合批次 REA 复核记录（2026-10-24）

## 结论

本轮重新绑定并复核了三类输入：

| 输入         | 用途                                             | 固定身份                                                                                                               |
| ------------ | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| 当前 V3 制品 | 识别当前发布版本实际包含的入口、字段和运行时资产 | `release-4.1.5` / `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84`；`v3dist` tree `1e499d92e11374e26c76f5e13be45251602bd596` |
| 旧 V3 源码   | 解释历史结构、字段、样式和资源差异               | `origin/release-3.4` / `175710fefeeba6ff295c2c0967b4d45b83563d26`                                                      |
| 当前 V4 源码 | 核对重构后的入口、表单、Store 和 Action          | `feature/v4-workloads` / `9767ad7c261afc796fb94e1db6d86fb8cfc41a19`                                                    |

复核结果为 **REA 材料已更新，仍不能放行 DEV**。当前源代码已经证明 Deployment、StatefulSet、DaemonSet 的详情“编辑设置”入口均打开原生 `WorkloadSettingsModal`；旧记录中“StatefulSet/DaemonSet 编辑设置仍直接打开 YAML”的结论只适用于早期快照，不能继续作为当前事实。运行时、RBAC、缓存隔离、配置引用和完整 V3 功能等价仍未闭环。

## 可复现取证命令

```bash
git rev-parse release-4.1.5
git rev-parse release-4.1.5:packages/bootstrap/assets/v3dist
git show origin/release-3.4:src/configs/steps/deployments.js
git show origin/release-3.4:src/configs/steps/statefulsets.js
git show origin/release-3.4:src/configs/steps/daemonsets.js
git show origin/release-3.4:src/actions/workload.js
rg -n 'editConfigTemplate|editYaml|WorkloadSettingsModal' \
  packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads
```

上述命令用于重新确认来源和静态链路。它们不能替代当前 SHA 制品部署后的 Network、浏览器和 Kubernetes API 证据。

## 旧 V3 参考得到的资源差异

固定旧源码确认三类资源共用基础信息、Pod、存储和高级设置结构；StatefulSet 额外有 Service 关联设置。历史 Action 差异如下：

| 能力            | Deployment                                  | StatefulSet                                     | DaemonSet                                                |
| --------------- | ------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| 编辑设置        | `workload.template.edit`，启用 GPU 选择     | `workload.template.edit`，保留 Service/PVC 差异 | `workload.template.edit`，没有副本数编辑                 |
| 更新策略        | `strategy`，含 `maxUnavailable`、`maxSurge` | `updateStrategy`，含 `partition`                | `updateStrategy`，含 `maxUnavailable`、`minReadySeconds` |
| 存储            | 普通卷和挂载                                | 普通卷加 `volumeClaimTemplates`                 | 普通卷和挂载                                             |
| 资源专属 Action | HPA                                         | Headless Service                                | 没有 HPA/Service 编辑                                    |
| 共同 Action     | 基础信息、回滚、YAML、重建、删除            | 同左                                            | 同左                                                     |

这些记录只作为功能边界输入，不代表当前 V4 已经通过等价验收。

## 当前 V4 静态复核结果

### 原生编辑设置入口

当前三个详情页都执行同一条原生设置链路：

1. 点击“编辑设置”时，按 `cluster/namespace/name` 读取原始资源；
2. 将原始资源交给 `WorkloadSettingsModal`；
3. 保存时通过 `buildDeploymentSettingsResource` 保留未编辑字段和 `resourceVersion`；
4. 使用 Workload Store 的 PUT mutation 保存；
5. 取消、保存成功和错误状态由当前详情页负责刷新或提示。

对应文件：

- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/index.tsx:312-425`
- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/index.tsx:310-414`
- `packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/index.tsx:273-389`
- `packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.tsx:50-147`

因此，当前 V4 的事实是：**三类资源均已接入原生设置 Modal，YAML 是独立 Action**。此前文档中将 StatefulSet、DaemonSet 的当前入口记录为 `editYaml` 已过时，后续以本记录为准。

### 当前表单的资源差异

`WorkloadSettingsModal` 和 `deployment.ts` 当前已经按资源类型区分以下行为：

| 能力               | 当前 V4 静态事实                                                        | 当前状态                                            |
| ------------------ | ----------------------------------------------------------------------- | --------------------------------------------------- |
| 副本数             | Deployment、StatefulSet显示；DaemonSet不写入 `spec.replicas`            | 已定位，需运行时验证                                |
| 更新策略           | Deployment 使用 `strategy`；StatefulSet/DaemonSet 使用 `updateStrategy` | 已定位，需验证默认值、保存和错误                    |
| StatefulSet 分区   | 读取和写回 `volumeClaimTemplates`，并将模板名称纳入挂载校验             | 已定位，需验证 PVC 持久化和删除语义                 |
| DaemonSet 分区     | 不展示 Pod 调度分区，支持 `minReadySeconds` 和 DaemonSet 更新策略       | 已定位，需验证节点语义和错误路径                    |
| Pod 调度           | Deployment、StatefulSet读取 `podScheduling`；DaemonSet拒绝该输入        | 已定位，需验证保留未知 affinity 的行为              |
| 优雅终止           | 读取和写回 `spec.template.spec.terminationGracePeriodSeconds`，默认 30  | 已定位，需在三类资源上部署验证                      |
| 元数据             | 读取和写回 Workload labels、annotations 及 Pod annotations              | 已定位，需验证系统字段和清空语义                    |
| 容器/初始化容器/卷 | 使用公共表单，按 StatefulSet PVC 模板名称参与挂载校验                   | 已定位，需验证 ConfigMap/Secret、镜像凭据和来源保留 |
| 409 错误           | 保存错误按 409 显示冲突提示，其他错误显示保存失败                       | 静态已定位，需浏览器验证                            |

对应源码位置：

- `packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.tsx:61-137,195-330`
- `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts:1157-1206`
- `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts:1456-1498`
- `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts:1501-1668`
- `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts:1751-1845`

### Action、API、作用域和缓存

当前详情页仍保留以下资源差异：

| Action         | Deployment                   | StatefulSet                                         | DaemonSet        |
| -------------- | ---------------------------- | --------------------------------------------------- | ---------------- |
| 基础信息       | 原生 PATCH                   | 原生 PATCH                                          | 原生 PATCH       |
| 编辑设置       | 原生 Modal + PUT             | 原生 Modal + PUT                                    | 原生 Modal + PUT |
| YAML           | 独立 YAML Action             | 独立 YAML Action                                    | 独立 YAML Action |
| HPA            | 按 metrics-server 和权限显示 | 按现有实现核对                                      | 不提供           |
| Service        | 不适用                       | `spec.serviceName` 存在时提供 Headless Service 编辑 | 不适用           |
| 回滚/重建/删除 | 保留                         | 保留                                                | 保留             |

当前静态代码已经绑定 `cluster/namespace/name` 作用域和三类资源 module。仍不能据此证明：

- 低权限账号的 403 是否与界面动作过滤一致；
- 切换 namespace、刷新、返回和直达 URL 后是否发生缓存串读；
- 保存、删除、回滚、重启和 Service 编辑后的列表/详情是否一致刷新；
- 409、403、404、网络失败和取消路径是否在浏览器中正确呈现；
- StatefulSet Service、PVC 模板和 DaemonSet 停止/恢复是否与旧 V3 行为等价。

### 配置引用与 V3/Wujie 边界

当前 Workload 的 ConfigMap/Secret 环境引用面板已经有 V4 原生解析和写回实现，但配置引用的文件挂载、旧入口和所有资源类型的真实页面验证仍需单独记录。仓库中其他 Workload 入口仍存在 `useV3action`、`/consolev3` 或 Wujie 引用；这些不能因项目详情页已原生化而自动关闭。集群级入口、配置引用和扩展初始化必须在后续 DEV/VERIFY 中逐项核对。

## REA 门禁结论

| 项目              | 结论                                                  |
| ----------------- | ----------------------------------------------------- |
| 当前制品来源      | 已固定为 `release-4.1.5` 的 `v3dist`                  |
| 旧源码参考        | 已固定为 `origin/release-3.4`，仅作结构/字段/样式参考 |
| 三类原生设置入口  | 当前源码已确认，旧记录已校正                          |
| 三类资源字段差异  | 静态链路已确认，运行时仍待验证                        |
| API/Store/作用域  | 静态链路已确认，实际 Network/RBAC 仍待验证            |
| 缓存/错误/取消    | 未完成浏览器闭环                                      |
| V3/Wujie 完全移除 | 未完成，仍有工作负载相关边界待处理                    |
| REA 状态          | **分析中，待负责人复核**                              |

本记录只完成 REA 证据纠偏和缺口收敛，不授权直接进入 DEV。下一步应由负责人复核本记录和现有矩阵；确认进入 DEV 后，优先处理配置引用原生闭环、DaemonSet 停止语义、三类设置保存/缓存/RBAC 以及集群级 V3/Wujie 入口。

## `release-4.1.5` 集群基线对比环境

为避免本地开发服务与集群页面的运行环境差异，已将当前制品基线部署到 131 集群的 `kubesphere-system` 命名空间。该 Deployment 使用独立名称和 Service，只增加一个对比入口，不修改现有 V4 `ks-console` Deployment、Service 或配置。

| 项目             | 基线对比环境                                                                  | 现有 V4 环境                                                              |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 命名空间         | `kubesphere-system`                                                           | `kubesphere-system`                                                       |
| Deployment       | `ks-console-v415-rea`                                                         | `ks-console`                                                              |
| Service          | `ks-console-v415-rea`                                                         | `ks-console`                                                              |
| NodePort         | `30881`                                                                       | `30880`                                                                   |
| 镜像             | `release-4.1.5-20261024-155944-fc1253c`                                       | `feature-v4-workloads-20261024-091102-31b6d88fc7e8`                       |
| 实际 Pod imageID | `sha256:2595b31de4dc01ae67b72b97b857ef40cd1c1ec2a0d406cada177982f380f455`     | `sha256:2956710cd7ef2fbda79ff7a0a9695dac466336bd08248784d5afdfb577b951d3` |
| 浏览器入口       | `http://192.168.2.131:30881`                                                  | `http://192.168.2.131:30880`                                              |
| rollout          | `generation=2`、`observedGeneration=2`、`ready=1`、`updated=1`、`available=1` | 现有 Pod 保持 Ready                                                       |

浏览器使用同一测试账号分别登录两个入口，基线页面和 V4 页面均可以打开。当前已取得的直接对比结果如下：

| 页面               | `release-4.1.5` 基线                                                 | 当前 V4                                                   |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------- |
| 集群 Workload 入口 | `/consolev3/clusters/host/deployments`                               | `/clusters/host/deployments`                              |
| 页面行为           | 旧 V3 Workload 列表，显示“编辑信息、编辑 YAML、重新创建、删除”等操作 | V4 原生 Workload 列表，显示项目、状态、创建入口和资源数据 |
| 请求边界           | 通过 `consolev3` 入口加载旧页面和资源请求                            | 通过当前 V4 路由和 `resources.kubesphere.io` API 加载列表 |

该部署只提供当前 `release-4.1.5` 制品的 REA 对照输入，不能直接视为 V4 VERIFY 通过。Deployment、StatefulSet、DaemonSet 的详情、编辑设置、字段默认值、校验、配置引用、错误态和完整 Action 对比仍需继续采集。

本轮又使用同一集群、同一 namespace、同一 Deployment `v4-deploy-edit-ef3` 完成详情页对比，证据见 [`evidence/workload-v415-baseline-browser-20261024.json`](./evidence/workload-v415-baseline-browser-20261024.json)。`release-4.1.5` 详情页显示“编辑设置、编辑 YAML、重新创建、删除”等入口；当前 V4 详情页显示原生“配置引用”Tab，操作菜单尚未展开。两边详情请求均返回 200，当前采集未发现 `wujie-app` 元素。该结果只关闭了 Deployment 详情入口的部分 REA 未知项，不能推断编辑表单、StatefulSet、DaemonSet、RBAC 或缓存已经等价。

## StatefulSet 与 DaemonSet 详情页运行时对照（2026-10-24）

本轮在同一集群、同一 namespace、同一组测试账号下，分别打开 `release-4.1.5` 基线 `30881` 和当前 V4 `30880` 的两个 StatefulSet、两个 DaemonSet 详情页。结构化记录见 [`evidence/workload-kind-detail-browser-20261024.json`](./evidence/workload-kind-detail-browser-20261024.json)，页面截图仅保存在本地 `.playwright-cli/`。

### 已取得的直接证据

- `StatefulSet/v4-pvc-sts-7fa`、`StatefulSet/v4-watch-sts-20261022-01`、`DaemonSet/v4-stop-ds-7fa` 和 `DaemonSet/v4-watch-ds-20261022-01` 的基线和 V4 详情路由均返回 HTTP 200，页面均渲染出项目、资源状态、Pod 列表和 `1/1` 状态。
- StatefulSet 基线菜单包含“回退、编辑服务、编辑设置、编辑 YAML、重新创建、删除”；当前 V4 菜单在该 fixture 上还显示“编辑自动扩缩”。这项差异需要结合资源是否存在 HPA、权限和当前 V4 的 Action 规则继续确认，不能直接判定为功能缺失或新增正确。
- DaemonSet 两边菜单均包含“回退、编辑设置、编辑 YAML、重新创建、删除”，没有显示 Service 编辑；当前 V4 的详情页额外提供“配置引用”Tab。
- 基线详情页的 Tab 为“资源状态、修改记录、元数据、环境变量、事件”；当前 V4 增加“配置引用”Tab。四类页面均未发现 `wujie-app` 元素。
- 当前 V4 DaemonSet 的实际读请求中，资源 GET、Pod 列表、HPA 查询和监控查询均返回 200；基线 DaemonSet 的资源 GET 与 Pod 列表也返回 200。请求均绑定 `host/v4-migration-e2e/<resource>`，未观察到跨 namespace 的资源路径。
- 本轮只读打开页面和读取请求，没有执行编辑、删除、伸缩、停止或恢复，因此不能把页面入口证据写成行为等价通过。

### 对 REA 缺口的影响

本轮关闭了 StatefulSet、DaemonSet 详情入口和基础渲染的运行时未知项，并补充了三类资源的页面 Action/Tab 差异。以下项目仍保持未验证：

- StatefulSet 的 Service、Headless Service、PVC 模板、partition/OnDelete 和保存回读；
- DaemonSet 的停止/恢复、更新策略、节点调度和保存回读；
- 三类资源设置表单的完整字段、清空/保留语义、409/403/404/网络失败和取消路径；
- 低权限 RBAC、namespace 切换后的缓存隔离、跨用户/集群作用域和全部 V3 功能逐项等价；
- HPA Action 的显示条件、空对象/权限拒绝时的错误呈现。

因此当前模块仍为 **REA / 分析中，待负责人复核**，本记录不授权进入 DEV，也不将历史 DEV、旧镜像或旧 VERIFY 记录继承为当前通过。
