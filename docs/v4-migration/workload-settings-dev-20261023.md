# Workload 原生编辑设置 DEV 进度与本地验证

## 范围与版本

- 模块：`workloads / deployment-statefulset-daemonset`。
- 分支 / Worktree：`feature/v4-workloads` / `console-workloads`。
- 负责人批准进入 DEV：`5c24342571419708b6f0c21f3ce9e8f193da0e17`，批准原文见 [REA 复核记录](./workload-rea-review-20261023.md)。
- 首批功能提交：`0c1d9aadf219fcabf5e6a310722591c9d7bef136`；生命周期增量提交：`da25187d33ca49d21afa0ad748b619e8a2786c64`；安全上下文增量提交：`9e2f4148f2abde58b6eec850612d99dc1ac3f0a8`；当前功能提交：`da741a3893f88885df4698a4ea5d265336fb9692`。
- 阶段仍为 DEV / 进行中；不是三类资源完整验收，也没有进入 VERIFY。

## 本次实现与保留行为

1. StatefulSet、DaemonSet 详情的“编辑设置”读取当前 namespace 下原始 API 对象，打开 V4 设置表单；“编辑 YAML”继续使用原有入口。权限键仍为各自资源的 `edit`，未增加权限，也未通过隐藏现有操作缩减功能。
2. 复用 `WorkloadSettingsModal` 和现有容器、初始化容器、卷、配置来源组件；三类资源分别解析和写入更新策略。Deployment 支持 `RollingUpdate/Recreate`、数量或百分比；StatefulSet 支持 `RollingUpdate/OnDelete` 和 partition；DaemonSet 支持 `RollingUpdate/OnDelete`、maxUnavailable、minReadySeconds，不生成 Deployment 的 replicas 字段。
3. 表单支持终止宽限时间，保留显式 `0`。策略切换到 Recreate/OnDelete 时移除不适用的 rollingUpdate；未编辑的策略、调度、安全上下文、Service、PVC 模板及原始 resourceVersion 保留。
4. StatefulSet 容器挂载校验同时识别 `volumeClaimTemplates` 的隐式卷名，不把这些模板伪造进 `template.spec.volumes`；未定义的卷名仍拒绝。
5. 保存使用原始 resourceVersion，`noGetDetail: true`；成功后刷新详情，读取失败显示错误，保存失败和 409 继续由原生 Modal 展示，不自动覆盖并发版本。

本次共享范围只在 Workload 编辑组件内：Deployment、StatefulSet、DaemonSet 共用转换和校验；创建表单仍使用原有 `DeploymentCreateValues` 和默认行为。未修改跨模块的通用 Store、缓存或 RBAC 底座。后续若需改这些底座，须先登记影响和回归范围。

## 实际执行与结果

| 命令/检查                                                                                                                         | 实际结果                                                                               | 边界                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `esno .../WorkloadCreateModal/deployment.test.ts`                                                                                 | 先复现 5 个新失败；策略校验与 PVC 模板分别复现额外失败；当前 24/24 通过                | 真正执行解析、校验和资源写回；保留未编辑字段和零值，不证明服务端持久化                         |
| `esno .../WorkloadUpdateStrategyInput.test.ts`                                                                                    | 新组件缺失时 3 个失败；当前 3/3 通过                                                   | 实际组件的分支和回调；浏览器依赖的 Kubed 控件替换为轻量边界，不证明页面渲染                    |
| `WORKLOAD_SETTINGS_TEST_REVISION=5c2434257 esno .../Workloads/settingsAction.test.ts`                                             | 原提交 Deployment 2 项通过，STS/DS 4 项失败                                            | 从 Git 读取原代码到内存复现，不改写或覆盖工作树                                                |
| `esno .../Workloads/settingsAction.test.ts`                                                                                       | 当前 6/6 通过                                                                          | 执行真实详情组件 Action；检查 namespaced GET、读取失败、打开设置及不误开 YAML；不证明真实 RBAC |
| `./scripts/test.sh`                                                                                                               | **72 个文件、304 个断言通过，0 失败**                                                  | 包含三类详情、Store、ArrayInput、ConfigReference 等现有回归；桥接测试通过不表示 V3 已移除      |
| `corepack yarn build:packages`                                                                                                    | 退出 0，appstore/console/core/shared 均构建完成                                        | 后续类型修正后又使用同一个 Rollup 配置重建 console 的 es/cjs，均成功                           |
| 变更生产文件 `eslint`                                                                                                             | 退出 0                                                                                 | 限当前 5 个修改/新增生产 TS/TSX 文件                                                           |
| 变更文件 `prettier`、`git diff --check`、`git diff --cached --check`                                                              | 通过                                                                                   | 格式检查不能替代功能验证                                                                       |
| `tsc -p packages/console/tsconfig.json --noEmit --incremental --tsBuildInfoFile /tmp/workload-console-check-20261023.tsbuildinfo` | **未通过**，存在 rootDir/文件列表和既有类型诊断；本次新增的 InputNumber 类型错误已修复 | 不能报告全项目 TypeScript 通过                                                                 |
| 同配置 TypeScript 编译器内存覆盖基线对照                                                                                          | 基线 1325 项 / 当前 1325 项，新增 0，本轮文件直接诊断 0                                | 见 [对照摘要](./evidence/workload-settings-dev-typecheck-20261023.json)；原项目问题仍未关闭    |
| `v4-module-gate.py workloads start/commit --phase DEV`                                                                            | Git、阶段结构、证据摘要检查通过                                                        | 不证明模块内容验收、部署或浏览器通过                                                           |

console 定向重建复用 `scripts/libs/create-rollup-config.js`，分别传入 `basePath=packages/console`、`format=es/cjs`，执行 Rollup `write` 和 `close`。构建保留了既有循环依赖警告，没有将警告写成错误或隐去。TypeScript 第一次使用 `--incremental false` 被 composite 项目以 TS6379 拒绝；改用上表的临时 build info 路径后才取得真实诊断。

## 131 环境身份与未执行验证

2026-10-23 只读回读确认 context 为 `default`，API 为 `https://192.168.2.131:6443`：

- Deployment：`kubesphere-system/ks-console`，副本数 `1`。
- 当前环境镜像仍为历史 tag `feature-v4-workloads-20261022-215739-27aaeced74e8`。
- Pod：`ks-console-6b9c55b7b5-2v5fg`，Running，容器 Ready。
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179`。

**本轮没有为 `0c1d9aadf` 构建/推送测试镜像，没有更新 Deployment，没有 rollout，也没有在该 SHA 的部署制品上做 Playwright。** 当前阶段仍有 DEV 缺口；旧页面、旧 tag 和旧 imageID 不能作为新代码的验收结果。

## 剩余清单

- 三类资源完整设置：调度、Pod 元数据、时区及其他高级容器字段、StatefulSet Service/PVC 模板编辑等仍须按原矩阵补齐，不能因本轮接入设置入口而关闭 WL-02。
- 集群级三类列表仍挂载 V3/Wujie。现有候选原生列表还含创建空回调，不能直接接路由后宣称完成。
- StatefulSet、DaemonSet 创建和各类 Action 仍需继续补齐；DaemonSet 停止语义尚未修复。
- 配置引用的 V3 Action/DOM 桥接尚未移除；WL-04 保留。
- 真实 RBAC 正反权限、namespace 隔离、缓存失效、API 持久化、保存/取消/冲突及当前制品渲染未完成。
- 三类资源分别完成 DEV 后，再按门禁构建当前 SHA 镜像、部署 131 并执行 Playwright；PR #2 保持 Draft，不自动合并。

## 生命周期原生编辑增量（2026-10-23）

本增量代码提交为 `da25187d33ca49d21afa0ad748b619e8a2786c64`，阶段仍为 DEV。没有关闭 WL-01～WL-04，也没有将 dry-run 当作部署或端到端验收。

### 当前制品与 API 依据

- 在同一固定 V3 tree `1e499d92e11374e26c76f5e13be45251602bd596` 中，惰性提取工厂 2287（生命周期分区）、1536（动作摘要/编辑/删除）和 2257（HTTP/命令/TCP 分派）。工厂 2287 明确编辑 `lifecycle.postStart/preStop` 并使用 `deleteNoObject`；2257 在 `componentType=life` 时不渲染健康检查时序，切换类型时删除其他 handler。
- 本轮实际调用 REA，解析三个派生 JS，无解析失败；完整分析引用 `ev_fddf27a4e4fee49236f8d471b63d47d6b2762baba91544460cd7315af5b2a89b`，见 [REA 摘要](./evidence/workload-lifecycle-20261023-rea-summary.json)。应用关系仍为 partial、语义为 unknown、676 项语义未知；摘要不是整个 V3 的完整逆向证明。
- [来源偏移和 SHA-256](./evidence/workload-lifecycle-20261023-provenance.json)及[重建脚本](./evidence/workload-lifecycle-extract.cjs)可重建三个工厂；本轮重建的偏移和摘要与已归档记录一致。没有执行目标 bundle。
- 131 为 Kubernetes `v1.31.13+k3s1`。`kubectl explain pod.spec.initContainers` 的概括文案不能覆盖 sidecar 例外；对应 [Kubernetes v1.31.13 校验实现](https://github.com/kubernetes/kubernetes/blob/v1.31.13/pkg/apis/core/validation/validation.go#L3513)明确允许 `restartPolicy=Always` 的 init 容器使用生命周期，普通 init 禁止。本轮 API dry-run 正反校验也已确认该差异。

### 实现与保留行为

1. 三类原生设置共用的 `ContainerInput` 增加启动后和终止前动作。HTTP 支持 HTTP/HTTPS、路径和端口；TCP 支持端口；命令采用已有 ArrayInput 逐项输入，保留逗号、空参数和首尾空格，不用逗号拆分 shell 参数。
2. 生命周期只写 handler，不写健康检查 timing；健康检查的五个时序输入保持，原有探针回归保留。协议选择同时供原有 HTTP 探针复用。
3. 明确删除动作时清除对应字段；未改动作、HTTP host/headers、其他容器设置、原始对象和 resourceVersion 保留；修改某个已建模动作时，不会删除其他未建模动作。
4. 普通初始化容器不新增无效的生命周期输入，并在校验阶段拒绝；已存在的 restartable init 保留 `restartPolicy=Always`，可以回填和修改生命周期。没有增加 sidecar 类型切换或改变其他初始化容器行为。
5. 共享影响仅为 Workload 创建/设置组件，适用于 Deployment、StatefulSet、DaemonSet；没有修改公共 Store、RBAC 或其他模块。Deployment 创建和三类设置均纳入回归。

### 实际命令与结果

| 命令                                                                       | 结果与边界                                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `esno .../WorkloadCreateModal/deployment.test.ts`                          | 从原 24 项增加到 32 项，全部通过；新增行为先复现失败，再实现。覆盖三类资源生命周期回填、修改、删除、未知字段保留、非法动作、参数保真和 sidecar 差异                                                          |
| `esno .../WorkloadCreateModal/ContainerLifecycle.test.ts`                  | 2/2；执行实际组件分支和回调，只替换浏览器控件边界；不能替代真实页面渲染                                                                                                                                      |
| `./scripts/test.sh`                                                        | 最终 73 个文件、314 项通过，0 失败                                                                                                                                                                           |
| `corepack yarn build:packages`                                             | 成功；最后的参数输入和 sidecar 调整后，按仓库 Rollup 配置额外重建 console ES/CJS，均成功；既有循环依赖警告保留                                                                                               |
| `eslint ContainerInput.tsx deployment.ts`                                  | 通过；曾发现 parseProbe 定义顺序错误，调整后通过，没有禁用规则                                                                                                                                               |
| Prettier、`git diff --check`、`git diff --cached --check`                  | 通过；不代表功能验收                                                                                                                                                                                         |
| TypeScript compiler API 基线对照                                           | 禁用 emit/composite/incremental 的同配置诊断：基线 699 项、当前 699 项、新增 0、变更生产文件直接错误 0；项目类型检查仍未全通过，见 [对照和源文件摘要](./evidence/workload-lifecycle-20261023-typecheck.json) |
| `node docs/v4-migration/evidence/workload-lifecycle-server-validation.cjs` | 三类实际生成资源的 131 服务端 dry-run 均接受；普通 init 无 Always 时按预期拒绝；见 [API 记录](./evidence/workload-lifecycle-20261023-api-validation.json)                                                    |

可复现的定向分析命令：`node docs/v4-migration/evidence/workload-lifecycle-extract.cjs /tmp/<尚不存在的绝对目录>`，然后将该目录的三个 `webpack-*.js` 交给 REA 的 `analyze_javascript_application`。目录摘要含输入元数据，重建时应核对原 bundle/tree 和工厂 SHA-256，不把新分析目录摘要当作整个 v3dist 的 tree。

### 尚未执行和下一项

本轮没有构建测试镜像、更新 ks-console、rollout 或在新制品上运行 Playwright；没有执行真实 hook、资源持久化、RBAC、namespace 切换或缓存验收。服务端 dry-run 没有保存资源，标签查询确认残留为 0。131 仍运行旧镜像，部署身份见 [环境记录](./evidence/workload-lifecycle-20261023-environment.json)。下一项按原清单继续原生设置中的调度及元数据；集群原生列表、创建、DaemonSet 停止语义和配置引用仍未关闭，不能声明三类资源已验收。

## 安全上下文原生编辑增量（2026-10-23）

本增量代码提交为 `9e2f4148f2abde58b6eec850612d99dc1ac3f0a8`，阶段仍为 DEV。它关闭 DS-12 的代码实现缺口，但当前 SHA 的真实持久化、RBAC 和浏览器场景仍属于 VERIFY，不能据此标记三类资源已验收。

### 当前制品依据

- 从固定 V3 tree `1e499d92e11374e26c76f5e13be45251602bd596` 惰性提取工厂 1540、1541、2276、2277、2282、2298。当前制品确认容器分区包含访问控制、用户/用户组、SELinux 和 capabilities；Pod 分区包含用户/用户组及 SELinux。
- 本轮实际调用 REA 分析六个派生 JS，6/6 解析成功、无解析失败。完整分析 Evidence 为 `ev_858febe6f3b01fdf0a3b239369d8c3da0193fc4b25fa3c4a7dfd934e3d5e2604`，摘要为 `ev_735b35ebd67592f92ce10c3d4229fe12d79e3a629fdc24c06af4983f810fbd8b`。应用范围内覆盖 complete，语义覆盖仍为 unknown，保留 743 项语义未知；不把定向工厂分析写成整个 V3 已恢复。
- [重建脚本](./evidence/workload-security-extract.cjs)、[来源偏移与摘要](./evidence/workload-security-20261023-provenance.json)和[REA 摘要](./evidence/workload-security-20261023-rea-summary.json)可以复核当前 bundle、偏移与 SHA-256；分析没有执行目标 bundle。旧 `release-3.4` 仅用于交叉核对结构，不作为当前制品源码来源。

### 实现与保留行为

1. Deployment 创建和三类资源设置共用 `SecurityContextInput`。容器级支持 privileged、allowPrivilegeEscalation、readOnlyRootFilesystem、runAsNonRoot、runAsUser/runAsGroup、SELinux 四字段及 capabilities add/drop；Pod 级只暴露当前 V3 已确认的用户/组和 SELinux 字段。
2. 三类资源分别解析和写回 `spec.template.spec.securityContext`，工作容器与初始化容器分别写回各自 `securityContext`。普通 init 与 restartable init 都按 Kubernetes 容器安全上下文处理，不复用生命周期限制。
3. 未编辑时保留原始对象；修改已建模字段时保留 seccompProfile、fsGroup 等未建模字段；显式关闭安全上下文时清除对应对象。空 SELinux 字段和空 capability 列表不生成无意义字段。
4. 校验拒绝非布尔访问控制、非整数 UID/GID、非字符串 SELinux 值和非法 capability 名称。现有原生表单、容器、生命周期、卷和更新策略行为继续回归。

### 实际验证

| 命令                                                                      | 结果与边界                                                                                                                                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `esno .../deployment.test.ts`                                             | 新增用例先出现 5 个失败；当前 38/38。覆盖三类 Pod 上下文、容器上下文、未知字段保留、显式清空、非法值和创建 payload                                                               |
| `esno .../SecurityContextInput.test.ts`                                   | 文件不存在时 2/2 失败；实现后 2/2，通过实际组件分支和回调，不替代浏览器渲染                                                                                                      |
| `./scripts/test.sh`                                                       | 首次因既有生命周期 VM 测试未模拟新组件导致 2 项失败；修复隔离边界后最终 **74 个文件、322 项通过，0 失败**                                                                        |
| `corepack yarn build:packages`                                            | 成功，appstore/console/core/shared 全部构建完成                                                                                                                                  |
| 变更生产文件 ESLint、全部变更 Prettier、`git diff --check`                | 通过                                                                                                                                                                             |
| TypeScript compiler API 基线对照                                          | 基线 `0a17b2e27` 699 项、当前 699 项、新增 0、变更生产文件直接错误 0；项目类型检查仍未全通过，见[记录](./evidence/workload-security-20261023-typecheck.json)                     |
| `node docs/v4-migration/evidence/workload-security-server-validation.cjs` | 绑定代码提交 `9e2f4148f`，Deployment、StatefulSet、DaemonSet 的 131 服务端 dry-run 均接受；没有保存资源，见[API 记录](./evidence/workload-security-20261023-api-validation.json) |

### 尚未执行和下一项

本增量没有构建或推送镜像，没有更新 131 的 ks-console，没有 rollout，也没有在当前 SHA 上登录浏览器。服务端 dry-run 只证明请求通过 Kubernetes API 校验，不证明实际 Pod 能运行、安全策略允许、页面可渲染或 RBAC 正确。下一项继续调度和 workload 顶层元数据；时区挂载、StatefulSet Service/PVC 模板、集群原生列表、创建、DaemonSet 停止语义和配置引用仍在 DEV 清单中。

## Pod 模板注解原生编辑增量（2026-10-23）

代码提交 `4f2b5fac91539ff4b7e96411897db5dd4e39f6ea` 按当前 `v3dist` 工厂 2306 的定向 REA 补齐 `spec.template.metadata.annotations`，适用于 Deployment 创建及 Deployment、StatefulSet、DaemonSet 原生编辑设置。表单复用 `PropertiesInput`，按运行时配置隐藏 `globals.config.preservedAnnotations`；受控值仍携带这些隐藏项，修改其他注解时不会静默删除保留注解。转换层支持回填、修改、空字符串值和显式清空，模板 labels 原样保留，并校验 Kubernetes qualified name。当前 V3 设置分区没有 Pod 模板 label 输入；旧 `AdvanceSettings/Metadata` 的 workload 顶层 labels/annotations 是另一入口，仍保留在后续 DEV 清单，不能把本增量写成“全部元数据已完成”。

测试先行先取得 5 个转换失败和 1 个组件缺失失败，实现后 `deployment.test.ts` 43/43、`PodAnnotationsInput.test.ts` 1/1 通过。完整 `./scripts/test.sh` 为 **75 个文件、328 项通过、0 失败**；`corepack yarn build:packages` 退出 0；生产文件 ESLint、变更文件 Prettier 与 `git diff --check` 通过。TypeScript 生产源按提交 `31a17890d9206a633206e208e6fc7d9836fa4021` 作基线比较，既有诊断 699、当前 699，本次新增 0、改动文件诊断 0；这不表示全项目 TypeScript 已通过。

131 集群 `v1.31.13+k3s1` 的 `v4-migration-e2e` namespace 对三类资源分别执行 `kubectl create --dry-run=server`，创建值经原生设置改为普通注解、保留注解和空值后均被 API 接受，残留资源为 0。该验证绑定代码提交 `4f2b5fac9`，没有持久化资源。

证据：

- [制品工厂来源](./evidence/workload-metadata-20261023-provenance.json)
- [REA 摘要](./evidence/workload-metadata-20261023-rea-summary.json)
- [TypeScript 基线比较](./evidence/workload-metadata-20261023-typecheck.json)
- [131 服务端 dry-run](./evidence/workload-metadata-20261023-api-validation.json)
- [可复现工厂提取脚本](./evidence/workload-metadata-extract.cjs)
- [可复现服务端验证脚本](./evidence/workload-metadata-server-validation.cjs)

本增量没有构建测试镜像、更新 131 的 `ks-console`、rollout 或登录当前 SHA 浏览器。调度、workload 顶层 labels/annotations、时区挂载、StatefulSet Service/PVC 模板、集群原生入口、DaemonSet 停止语义和配置引用仍在 DEV 清单，因此阶段保持 DEV。

## Pod 调度与节点选择增量（2026-10-23）

代码提交 `7db1a9353ea42ce2e4a8898bd4cf8110ac2d97a9` 依据当前 `v3dist` 工厂 1530、2440、2583 的定向 REA，实现 Deployment 和 StatefulSet 设置中的默认、分散、聚合、自定义 Pod 亲和/反亲和规则。分散和聚合分别生成权重 100、拓扑键 `kubernetes.io/hostname` 的 preferred `podAntiAffinity` 和 `podAffinity`；自定义规则要求唯一 policy、required/preferred 类型及当前 cluster/namespace 内同类工作负载目标。Deployment 创建同时支持 Pod 调度和 `spec.template.spec.nodeSelector`，节点选择键和值按 Kubernetes qualified name/label value 校验。

DaemonSet 的旧 V3 UI 快照没有调度分区，因此当前 V4 不为它虚构该入口，并在编辑其他字段时完整保留原有 `affinity`。Deployment/StatefulSet 遇到 nodeAffinity、多个同策略规则、额外 selector 条件等无法由旧 V3 单规则模型安全表达的配置时，显示“保留已有高级调度配置”；未主动切换时不重写原对象。`tolerations` 未由本次当前制品工厂闭环，仍按未建模字段保留并留在 DEV 清单。

测试先行先取得 `deployment.test.ts` 5 项失败及两个组件缺失失败；实现后转换测试 49/49、`PodSchedulingInput.test.ts` 1/1、`NodeSelectorInput.test.ts` 1/1 通过。精确提交 `7db1a9353` 的完整 `./scripts/test.sh` 为 **77 个文件、336 项通过、0 失败**；`corepack yarn build:packages` 退出 0；生产文件 ESLint、变更文件 Prettier 与 `git diff --check` 通过。TypeScript 生产源按上一提交 `6d49487a97ee94ee582cfc445e7e165bf4bcd3e4` 作同配置基线比较，既有诊断 691、当前 691，本次新增 0、改动文件诊断 0；全项目既有类型诊断仍未关闭。

131 集群 `v1.31.13+k3s1` 的 `v4-migration-e2e` namespace 对 Deployment 分散调度和节点选择、StatefulSet 自定义亲和/反亲和、DaemonSet 既有 nodeAffinity 保留分别执行 `kubectl create --dry-run=server`，三类资源均被 API 接受，残留资源为 0。验证绑定代码提交 `7db1a9353`，没有持久化资源。

证据：

- [制品工厂来源](./evidence/workload-scheduling-20261023-provenance.json)
- [REA 摘要](./evidence/workload-scheduling-20261023-rea-summary.json)
- [TypeScript 基线比较](./evidence/workload-scheduling-20261023-typecheck.json)
- [131 服务端 dry-run](./evidence/workload-scheduling-20261023-api-validation.json)
- [可复现工厂提取脚本](./evidence/workload-scheduling-extract.cjs)
- [可复现服务端验证脚本](./evidence/workload-scheduling-server-validation.cjs)

本增量没有构建或推送测试镜像，没有更新 131 的 `ks-console`、rollout 或登录当前 SHA 浏览器。workload 顶层 labels/annotations、时区挂载、StatefulSet Service/PVC 模板、集群原生入口、DaemonSet 停止语义、配置引用和完整 Action/RBAC 仍在 DEV 清单，因此阶段保持 DEV。

## Deployment 创建顶层元数据增量（2026-10-23）

代码提交 `86ce8b4abdb4a27b8b6bd35e55406d238eb56383`（功能提交 `55817d12ffaf81630a625871d15db215fd1e3b34`，类型兼容修复 `86ce8b4abdb4a27b8b6bd35e55406d238eb56383`）依据当前 `v3dist` 工厂 2439 与 main 工厂 52 的定向 REA，补齐 Deployment 创建中的 workload 顶层标签和注解。自定义标签与系统 `app=<name>` 合并后，同步写入 `metadata.labels`、`spec.selector.matchLabels` 和 `spec.template.metadata.labels`；系统 app、`kubesphere.io/alias-name` 和 `kubesphere.io/description` 保持优先，避免自定义值破坏 selector 或系统元数据。顶层注解与 Pod 模板注解使用独立字段。

表单复用 `PropertiesInput`，执行 Kubernetes label key/value 与 annotation key 校验；在提交前通过既有 `deploymentStore.checkLabels` 按当前 cluster、namespace、name 检查标签重复。重复返回 `DUPLICATE_LABELS`，请求失败返回 `WORKLOAD_LABEL_CHECK_FAILED`，不会静默放行。

### REA 与可复现来源

- 固定制品 tree：`1e499d92e11374e26c76f5e13be45251602bd596`。
- 工厂 2439：高级创建元数据分区、`preservedAnnotations`、标签校验和 `checkLabels`；工厂 52：`updateLabels` 同步资源、selector 和 Pod 模板 labels。
- 实际 REA：parent `ev_9092fbb9bbe8885efccb23873640773befb0a1d02e9a2a3909f5ce667c72468e`，summary `ev_a2c4463abf38b503c69f44e6bb79e97df99d62444efacd391f4c02824660f40e`，输入摘要 `31859fceccf9de31164c812f7f844f17f4010fa122bd61f2d197e89f5bcacb65`。覆盖为 partial，不能推断未命中行为不存在。
- 可复现命令：`node docs/v4-migration/evidence/workload-top-metadata-extract.cjs /tmp/<尚不存在的绝对目录>`；来源偏移、Bundle 和工厂哈希见[来源记录](./evidence/workload-top-metadata-20261023-provenance.json)，分析范围见[REA 摘要](./evidence/workload-top-metadata-20261023-rea-summary.json)。

### 实际验证

| 命令/检查                                                                                       | 结果                                                                              | 边界                                                                                     |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `esno .../WorkloadCreateModal/deployment.test.ts`、`esno .../WorkloadCreateModal/index.test.ts` | 测试先行复现标签未同步、校验/字段缺失；实现后定向测试 55/55 通过                  | 覆盖转换、系统字段优先、重复/失败返回和表单接线；不证明浏览器渲染                        |
| `./scripts/test.sh`                                                                             | 精确代码提交 `86ce8b4ab`：77 个文件、340 项通过、0 失败                           | 仓库现有测试范围                                                                         |
| `corepack yarn build:packages`                                                                  | 精确代码提交 `86ce8b4ab`：退出 0，`@ks-console/shared` 完成 633/633 minify        | 未构建、推送 Console 镜像                                                                |
| TypeScript 生产源基线比较                                                                       | 基线 `5a792bac47e3cd0f92daa49e81c3b2ecbe0902ec` 691，当前 691，新增 0、改动文件 0 | 全项目既有诊断仍存在；见[记录](./evidence/workload-top-metadata-20261023-typecheck.json) |
| `node docs/v4-migration/evidence/workload-top-metadata-server-validation.cjs`                   | 131 `v1.31.13+k3s1` 接受 Deployment server dry-run；5 项字段检查通过，残留资源 0  | 不保存资源；见[API 记录](./evidence/workload-top-metadata-20261023-api-validation.json)  |

本增量没有构建或推送测试镜像，没有更新 131 的 `ks-console`、rollout 或登录当前 SHA 浏览器。StatefulSet/DaemonSet 创建、已有资源顶层元数据编辑、时区、StatefulSet Service/PVC 模板、集群原生入口、DaemonSet 停止语义、配置引用和完整 Action/RBAC 仍在 DEV 清单，因此阶段保持 DEV。

## 宿主时区同步增量（2026-10-23）

代码提交 `da741a3893f88885df4698a4ea5d265336fb9692` 依据当前 `v3dist` 工厂 933/2285 的定向 REA，在普通容器和初始化容器表单补齐“同步宿主机时区”开关。启用时写入 `name=host-time`、`mountPath=/etc/localtime`、`readOnly=true`；任一普通或初始化容器保留该挂载时，Pod 模板自动维护 `host-time` HostPath 卷。全部容器关闭后只删除名称和路径均匹配的系统卷，其他卷、挂载顺序和未知字段保持不变。三类原生设置共用该转换，Deployment 创建同时接入。

### REA 与可复现来源

- 固定制品 tree：`1e499d92e11374e26c76f5e13be45251602bd596`。工厂 2285 负责容器开关及挂载，工厂 933 在普通/初始化容器合并后维护系统卷。
- 实际 REA：parent `ev_6cb9459efa2f4ace1cbe93ed88e3948933873e8e268dc8bf6113ead43d8bab8f`，summary `ev_d25ffd82edf028b2d2cb795a6ea57a7d2652f42aa24797092e49038aac3dd1b9`，输入摘要 `d9813d3d7d97d94fbab7352e20a4d4be1f520f2411ede21133b8152243b132de`。语义覆盖为 unknown，1414 个未知节点保留。
- 可复现命令：`node docs/v4-migration/evidence/workload-timezone-extract.cjs /tmp/<尚不存在的绝对目录>`；来源偏移与哈希见[来源记录](./evidence/workload-timezone-20261023-provenance.json)，覆盖限制见[REA 摘要](./evidence/workload-timezone-20261023-rea-summary.json)。

### 实际验证

| 命令/检查                                                                                                | 结果                                                                                                             | 边界                                                                                 |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `esno .../WorkloadCreateModal/deployment.test.ts`、`esno .../WorkloadCreateModal/ContainerInput.test.ts` | 测试先行复现 3 个失败；实现后 54/54 与 3/3 通过                                                                  | 覆盖创建、回填、任一启用/全部关闭及表单接线                                          |
| `./scripts/test.sh`                                                                                      | 精确代码提交 `da741a389`：77 个文件、343 项通过、0 失败                                                          | 仓库现有测试范围                                                                     |
| `corepack yarn build:packages`                                                                           | 精确代码提交 `da741a389`：退出 0，633/633 minify 完成                                                            | 未构建或推送 Console 镜像                                                            |
| TypeScript 生产源基线比较                                                                                | 基线 `6367c5b03f5053fec48d6d0b730346c67b96b34f` 691，当前 691，新增 0、改动文件 0                                | 全项目既有诊断仍存在；见[记录](./evidence/workload-timezone-20261023-typecheck.json) |
| `node docs/v4-migration/evidence/workload-timezone-server-validation.cjs`                                | 131 `v1.31.13+k3s1` 的 Deployment、StatefulSet、DaemonSet server dry-run 均接受；卷/只读挂载检查通过，残留资源 0 | 不保存资源；见[API 记录](./evidence/workload-timezone-20261023-api-validation.json)  |

本增量没有构建或推送测试镜像，没有更新 131 的 `ks-console`、rollout、登录当前 SHA 浏览器或启动真实 Pod。HostPath 策略和实际容器时区必须在 VERIFY 用专用测试资源检查。StatefulSet/DaemonSet 创建、已有资源顶层元数据编辑、StatefulSet Service/PVC 模板、集群原生入口、DaemonSet 停止语义、配置引用和完整 Action/RBAC 仍在 DEV 清单，因此阶段保持 DEV。

## DaemonSet 停止语义修复（2026-10-23）

代码提交 `da741a3893f88885df4698a4ea5d265336fb9692` 按当前制品 main 工厂 318 修复共享 Workload Store：DaemonSet 停止 PATCH `spec.template.spec.nodeSelector.non-existing=true`，Deployment/StatefulSet 仍 PATCH `spec.replicas=0`。测试先行复现 DaemonSet 错误副本补丁；实现后 Store 20/20 通过，完整回归 77 文件/344 项通过，包构建和类型基线 691→691 通过。131 专用 DaemonSet 的 merge patch server dry-run 被接受，回读 resourceVersion/nodeSelector 不变，见[API 记录](./evidence/workload-stop-20261023-api-validation.json)。来源和实际 REA 见[来源](./evidence/workload-stop-20261023-provenance.json)与[摘要](./evidence/workload-stop-20261023-rea-summary.json)。本轮没有执行真实停止或恢复，相关调度、原 nodeSelector 恢复、RBAC、错误反馈和缓存必须在 VERIFY 完成。
