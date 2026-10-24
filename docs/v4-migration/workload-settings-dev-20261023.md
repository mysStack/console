# Workload 原生编辑设置 DEV 进度与本地验证

## 范围与版本

- 模块：`workloads / deployment-statefulset-daemonset`。
- 分支 / Worktree：`feature/v4-workloads` / `console-workloads`。
- 负责人批准进入 DEV：`5c24342571419708b6f0c21f3ce9e8f193da0e17`，批准原文见 [REA 复核记录](./workload-rea-review-20261023.md)。
- 首批功能提交：`0c1d9aadf219fcabf5e6a310722591c9d7bef136`；生命周期增量提交：`da25187d33ca49d21afa0ad748b619e8a2786c64`；安全上下文增量提交：`9e2f4148f2abde58b6eec850612d99dc1ac3f0a8`；DEV 源提交：`0a44f5706d1a6ba9b266360caa2d4128d8bb08a2`。
- DEV 已完成并进入 VERIFY；三类资源仍须完成当前 SHA 的部署后验收，尚未进入 PR 阶段。

## 本次实现与保留行为

1. StatefulSet、DaemonSet 详情的“编辑设置”读取当前 namespace 下原始 API 对象，打开 V4 设置表单；“编辑 YAML”继续使用原有入口。权限键仍为各自资源的 `edit`，未增加权限，也未通过隐藏现有操作缩减功能。
2. 复用 `WorkloadSettingsModal` 和现有容器、初始化容器、卷、配置来源组件；三类资源分别解析和写入更新策略。Deployment 支持 `RollingUpdate/Recreate`、数量或百分比；StatefulSet 支持 `RollingUpdate/OnDelete` 和 partition；DaemonSet 支持 `RollingUpdate/OnDelete`、maxUnavailable、minReadySeconds，不生成 Deployment 的 replicas 字段。
3. 表单支持终止宽限时间，保留显式 `0`。策略切换到 Recreate/OnDelete 时移除不适用的 rollingUpdate；未编辑的策略、调度、安全上下文、Service、PVC 模板及原始 resourceVersion 保留。
4. StatefulSet 容器挂载校验同时识别 `volumeClaimTemplates` 的隐式卷名，不把这些模板伪造进 `template.spec.volumes`；未定义的卷名仍拒绝。
5. 保存使用原始 resourceVersion，`noGetDetail: true`；成功后刷新详情，读取失败显示错误，保存失败和 409 继续由原生 Modal 展示，不自动覆盖并发版本。

本次共享范围在 Workload 编辑/创建组件和 Workload Store 内：Deployment、StatefulSet、DaemonSet 共用转换和校验；创建表单现已按资源类型支持三类资源，StatefulSet 通过专用 mutation 创建 Workload 与 Headless Service。未修改跨模块缓存或 RBAC 底座。后续若需改这些底座，须先登记影响和回归范围。

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

- 三类资源已确认的公共设置和资源特有设置已完成主要代码增量；仍须按字段矩阵关闭未建模高级字段、Action 及错误边界，不能因现有表单可用而关闭 WL-02。
- 集群级三类主列表已切换到原生路由和组件；StatefulSet 创建已完成 DEV 代码，但当前 SHA 页面、真实持久化与双资源错误恢复尚未闭环，不能据此宣称完成。
- StatefulSet 与 DaemonSet 原生创建、DaemonSet 停止语义已完成 DEV 代码与本地/API dry-run 验证；真实持久化、双资源部分成功恢复和浏览器行为留待 VERIFY，各类未完成 Action 继续列入 DEV 清单。
- 普通项目三类配置引用的不可达 V3 Action/DOM 桥接已移除；真实保存、失败、权限、namespace 和缓存行为仍须在 VERIFY 关闭。
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

## StatefulSet PVC 模板设置（2026-10-23）

代码提交 `e0dbb45d3f70e799f3441ac515a575af9a50f94f` 在原生 `WorkloadSettingsModal` 中加入 StatefulSet 专用 PVC 模板列表。表单支持模板名称、访问模式、容量和 StorageClass，名称改动会同步参与容器挂载卷名校验；写回时保留原始模板中未建模的 metadata/spec 字段，删除字段时不伪造 `template.spec.volumes`。普通 Deployment/DaemonSet 不展示该分区。

### 实际验证

| 命令/检查                                                                     | 结果                                                                                                                  | 边界                                                                                                                                            |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `./scripts/test.sh`                                                           | **77 个文件、346 项通过，0 失败**                                                                                     | 覆盖解析、校验、写回、未建模字段保留和四种内置语言文案；不能替代真实页面渲染                                                                    |
| `corepack yarn build:packages`                                                | **退出 0，633/633 minify 完成**                                                                                       | 仅为本地包构建，未产生部署制品                                                                                                                  |
| 变更生产文件 `eslint`、Prettier、`git diff --check`                           | 通过                                                                                                                  | 不能替代部署后验收                                                                                                                              |
| `tsc --noEmit -p packages/console/tsconfig.json`                              | **未通过，1316 条仓库既有诊断**；本轮三个生产文件无直接错误                                                           | 见 [TypeScript 记录](./evidence/workload-pvc-template-20261023-typecheck.json)，不能报告全项目通过                                              |
| `node docs/v4-migration/evidence/workload-pvc-template-server-validation.cjs` | **131 `v1.31.13+k3s1` StatefulSet server dry-run 接受**；修改访问模式/容量并保留 label、volumeMode、额外 request 字段 | 不保存资源，不证明真实 Service/PVC 持久化、RBAC、缓存或浏览器渲染；见 [API 记录](./evidence/workload-pvc-template-20261023-api-validation.json) |

本次关闭的是 StatefulSet PVC 模板的 DEV 代码缺口，不关闭 StatefulSet Service 的真实保存、PVC 生成及删除约束，也不关闭当前 SHA 的部署、Playwright、低权限、namespace 隔离和缓存验收。PR #2 继续保持 Draft。

## StatefulSet Service 保存边界（2026-10-23）

代码提交 `f32b13391b7fb537a46a96ff37a52b53a5360904` 保留详情页已有的 StatefulSet Headless Service 原生编辑入口，并将表单占位值转换为 Kubernetes Service payload：Headless 写入 `clusterIP=None`，VirtualIP 清除占位值，保存时使用最新读取到的 `metadata.resourceVersion`。保存失败会保留弹窗并显示失败提示，不再把失败误报为成功或静默关闭。

### 实际验证

| 命令/检查                                                                | 结果                                                                                                                                    | 边界                                                                                                                             |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `./scripts/test.sh`                                                      | **78 个文件、348 项通过，0 失败**                                                                                                       | 新增 Service payload 的 Headless/VirtualIP/资源版本回归；不能替代真实浏览器操作                                                  |
| `corepack yarn eslint ...StatefulSetServiceModal...`                     | 0 错误，保留 1 个既有 `useEffect` 依赖警告                                                                                              | 警告来自原有详情读取逻辑，不是本次新增错误                                                                                       |
| `corepack yarn build:packages`                                           | **退出 0，633/633 minify 完成**                                                                                                         | 仅为本地包构建，未产生部署制品                                                                                                   |
| `node docs/v4-migration/evidence/workload-service-server-validation.cjs` | **131 `v1.31.13+k3s1` Service PATCH server dry-run 接受**；Headless `clusterIP=None` 和端口修改均被 API 接受，回读 resourceVersion 不变 | 不保存资源，不证明真实页面保存、RBAC、409/403、缓存刷新；见 [API 记录](./evidence/workload-service-20261023-api-validation.json) |

本次关闭的是 Service payload 和错误反馈的 DEV 缺口；StatefulSet Service 的真实 UI 保存、取消、并发冲突、低权限拒绝、保存后详情刷新，以及 PVC 实际生成和完整浏览器验收仍未完成。当前阶段保持 DEV，PR #2 保持 Draft。

## 三类 Workload 顶层元数据编辑（2026-10-23）

代码提交 `30c5d0e7446d55e03f295b7a5753bde645c15c30` 将 Deployment 创建阶段已经实现的 Workload 顶层 metadata 能力接入三类资源的原生设置表单。Deployment、StatefulSet、DaemonSet 均可回填、修改和清空 `metadata.labels` 与 `metadata.annotations`；系统 `app` 标签在表单中隐藏并随受控值保留，KubeSphere 保留注解继续由运行时配置隐藏。顶层 metadata 与 `spec.selector`、Pod 模板 metadata 分开写回，修改顶层值不会重写不可变 selector 或 Pod 模板。

### 实际验证

| 命令/检查                                                                              | 结果                                                                                                                                    | 边界                                                                                                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 定向 `deployment.test.ts`、`index.test.ts`                                             | **60/60、4/4 通过**                                                                                                                     | 覆盖三类资源回填、修改、清空、非法键拒绝、selector/Pod 模板隔离和表单接线                                                                     |
| `./scripts/test.sh`                                                                    | **78 个文件、353 项通过，0 失败**                                                                                                       | 仓库现有测试范围；不证明浏览器组件行为                                                                                                        |
| 变更文件 ESLint、Prettier、`git diff --check`                                          | **通过，0 错误**                                                                                                                        | 静态质量检查                                                                                                                                  |
| `corepack yarn build:packages`                                                         | **退出 0，633/633 minify 完成**                                                                                                         | 仅为本地包构建，未构建 Console 镜像                                                                                                           |
| `node docs/v4-migration/evidence/workload-existing-top-metadata-server-validation.cjs` | **131 `v1.31.13+k3s1` 三类资源 server dry-run 均接受**；系统字段保留、普通字段更新、空值、selector/Pod 模板不变检查全部通过，残留资源 0 | 不保存资源，不证明真实页面持久化、RBAC、缓存或并发冲突；见 [API 记录](./evidence/workload-existing-top-metadata-20261023-api-validation.json) |

本次关闭三类已有资源顶层 metadata 的 DEV 代码缺口。当前 SHA 尚未构建 Console 镜像、部署 131 或执行 Playwright；低权限拒绝、namespace 隔离、保存后刷新、冲突/网络错误和 V3 页面等价性仍归 VERIFY。当前阶段保持 DEV，PR #2 保持 Draft。

## 配置引用移除 V3/Wujie 桥接（2026-10-23）

代码提交 `59e2fc1158b291f90abf8122984eb24d48536456` 删除已经被三类原生 `config-reference` 路由替代、且没有生产导入方的 `entry.tsx` 和 `bridge.ts`。原桥接通过 `useV3action`、Wujie Shadow DOM 和 `workload.template.edit` 打开 V3 编辑器；当前 Deployment、StatefulSet、DaemonSet 详情均直接渲染 `ConfigReferencePage`，使用 V4 Workload Store、ConfigMap/Secret Store 和 JSON Patch 保存。删除的是不可达的旧桥接实现，不删除原生配置引用页面、摘要、预览、草稿转换或 Patch 能力。

### 实际验证

| 命令/检查                                                                         | 结果                                                               | 边界                                                                                                           |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| 测试先行 `entry.test.ts`                                                          | 删除前因生产代码仍命中 V3/Wujie 依赖而失败；删除后 **2/2 通过**    | 同时检查三类详情路由均挂载对应的 `ConfigReferencePage`                                                         |
| `./scripts/test.sh`                                                               | **77 个文件、334 项通过，0 失败**                                  | 相比上一增量删除 20 项仅验证旧 V3 DOM 桥接的测试，新增 1 项原生路由/依赖回归；功能转换、预览和保存测试继续保留 |
| 变更文件 ESLint、Prettier、`git diff --check`                                     | **通过，0 错误**                                                   | 静态质量检查                                                                                                   |
| `corepack yarn build:packages`                                                    | **退出 0，633/633 minify 完成**                                    | 证明删除文件没有生产导入；未构建 Console 镜像                                                                  |
| `node docs/v4-migration/evidence/workload-config-reference-native-validation.cjs` | 三类原生路由均存在，旧桥接文件均不存在，生产代码禁用依赖命中数为 0 | 只读静态证据；见 [验证记录](./evidence/workload-config-reference-native-20261023.json)                         |

本次关闭普通项目三类 Workload 配置引用的 V3 Action/Wujie DOM 依赖代码缺口。真实保存、取消、409/403、网络失败、低权限、namespace 隔离、缓存刷新及当前 SHA 浏览器 Network 仍归 VERIFY；集群级 Workload 列表的 Wujie 入口是另一项 DEV 缺口。当前阶段保持 DEV，PR #2 保持 Draft。

## DaemonSet 停止语义修复（2026-10-23）

代码提交 `da741a3893f88885df4698a4ea5d265336fb9692` 按当前制品 main 工厂 318 修复共享 Workload Store：DaemonSet 停止 PATCH `spec.template.spec.nodeSelector.non-existing=true`，Deployment/StatefulSet 仍 PATCH `spec.replicas=0`。测试先行复现 DaemonSet 错误副本补丁；实现后 Store 20/20 通过，完整回归 77 文件/344 项通过，包构建和类型基线 691→691 通过。131 专用 DaemonSet 的 merge patch server dry-run 被接受，回读 resourceVersion/nodeSelector 不变，见[API 记录](./evidence/workload-stop-20261023-api-validation.json)。来源和实际 REA 见[来源](./evidence/workload-stop-20261023-provenance.json)与[摘要](./evidence/workload-stop-20261023-rea-summary.json)。本轮没有执行真实停止或恢复，相关调度、原 nodeSelector 恢复、RBAC、错误反馈和缓存必须在 VERIFY 完成。

## DaemonSet 原生创建（2026-10-23）

代码提交 `35ca7fb7968821606ae581ef7ccc3758908b8c6f` 将项目级 DaemonSet 列表接入原生创建。创建表单按 `kind` 复用 Deployment 已有的容器、卷、环境变量、安全上下文、时区、Pod 模板注解和顶层元数据能力，并按 DaemonSet 资源边界隐藏副本数和旧 V3 未提供的 Pod 调度分区。生成对象为 `apps/v1 DaemonSet`，不写入 `spec.replicas`，支持 `RollingUpdate/OnDelete`、`maxUnavailable`、`minReadySeconds` 和优雅终止时间。提交使用当前 cluster/namespace 的 DaemonSet Store，成功后刷新列表并关闭弹窗，失败时显示四种内置语言的资源专用错误文案并保留表单。

### 实际验证

| 命令/检查                                                                                                                  | 结果                                                                                                                                                   | 边界                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `esno .../WorkloadCreateModal/deployment.test.ts`、`index.test.ts`、`daemonset.locale.test.ts`、`DaemonSets/index.test.ts` | 测试先行先复现 `buildDaemonSet`、按资源类型表单、列表接线和文案缺失；实现后分别 **62/62、5/5、4/4、3/3 通过**                                          | 覆盖对象转换、资源差异、页面提交/刷新/错误接线和多语言键；不证明真实浏览器控件渲染           |
| `./scripts/test.sh`                                                                                                        | 精确代码提交 `35ca7fb79`：**78 个文件、342 项通过、0 失败**                                                                                            | 仓库现有测试范围                                                                             |
| 变更生产文件 ESLint                                                                                                        | **0 错误**；保留 DaemonSet 页面一条既有 `max-len` 警告                                                                                                 | 该长路由在本次提交前已存在                                                                   |
| 变更文件 Prettier、`git diff --check`                                                                                      | **通过**                                                                                                                                               | 格式检查不能替代功能验收                                                                     |
| `corepack yarn build:packages`                                                                                             | **退出 0，633/633 minify 完成**                                                                                                                        | 仅为本地包构建，未构建或推送 Console 镜像                                                    |
| `tsc --noEmit -p packages/console/tsconfig.json`                                                                           | **未通过**：依赖 `type-fest` 产生 147 条既有解析诊断；本次 WorkloadCreateModal/DaemonSets 文件匹配 0 条                                                | 不报告全项目 TypeScript 通过                                                                 |
| `node docs/v4-migration/evidence/workload-daemonset-create-server-validation.cjs`                                          | 绑定精确源码提交 `35ca7fb79`；131 `v1.31.13+k3s1` 接受生成的 DaemonSet server dry-run，无 `replicas`，策略、就绪时间和优雅终止字段检查通过，残留资源 0 | 不保存资源；见 [API 记录](./evidence/workload-daemonset-create-20261023-api-validation.json) |

本次关闭项目级 DaemonSet 原生创建的 DEV 代码缺口。当前 SHA 尚未构建 Console 镜像、部署 131、执行 rollout 或登录已部署制品做 Playwright；真实创建/删除、API 持久化、RBAC 正反权限、namespace 隔离、缓存刷新、失败/取消路径和 V3 功能等价性仍归 VERIFY。后续 StatefulSet 原生创建增量已按要求加入双资源 dry-run；集群级三类入口在创建和 Action 等价性关闭前不切换。阶段保持 DEV，PR #2 保持 Draft。

## StatefulSet 原生创建（2026-10-23）

代码提交 `6328e67aa3c93234d62150337dd4dd2a0df770ff` 将项目级 StatefulSet 列表的创建入口替换为原生表单，并按当前 V3 制品与合法旧源码的交叉证据构造 StatefulSet 和配套 Headless Service。旧源码仅用于核对双资源流程、Service 名称、selector、端口和注解，不作为当前 `v3dist` 的源码身份声明。

### 实现与边界

1. StatefulSet 复用三类 Workload 的容器、初始化容器、更新策略、终止宽限期、调度、节点选择、卷、PVC 模板、标签与注解输入；工作容器端口可以独立填写 Service 端口，初始化容器不会生成 Service 端口。
2. StatefulSet 写入 `spec.serviceName`、`RollingUpdate.partition` 或 `OnDelete`、PVC 模板与 Pod 终止宽限期。Headless Service 写入 `clusterIP=None`、`sessionAffinity=None`、去除 `version` 的 Pod selector、别名/类型注解及已选择的端口映射。
3. Service 名称沿用已核对的 V3 规则：工作负载名称截到 57 位后拼接 4 位后缀；首字符不是字母时增加 `s`。同一次失败重试保留名称，工作负载名称变化时重新生成。
4. Store 先并行 dry-run StatefulSet 和 Service；两项均成功后才并行提交实际创建。dry-run 任一失败时不会发出持久化请求。Kubernetes 不提供这两个 POST 的事务，实际提交阶段仍可能出现一项成功、一项失败；VERIFY 必须验证错误提示、残留识别和人工恢复路径，在关闭前不宣称原子创建。
5. 成功后关闭弹窗、刷新当前 namespace 列表并显示成功消息；失败时保留弹窗并显示本地化错误。实际浏览器、权限、namespace、缓存与持久化行为尚未验证。

### 测试先行与本地验证

- RED：构建器 3 项、Store 2 项、Modal 1 项、列表接线 1 项及四种语言键先因实现缺失失败，再进入生产代码修改。
- 定向测试：构建器 65/65、Workload Store 22/22、创建 Modal 5/5、StatefulSet 列表 3/3、作用域刷新 12/12、四种语言 4/4 通过。
- `./scripts/test.sh`：79 个文件、352 项通过，0 失败。
- `corepack yarn build:packages`：退出 0，appstore、console、core、shared 均构建完成，shared 完成 633/633 minify；保留既有循环依赖和 Node 模块警告。
- 变更文件 Prettier、`git diff --check`、提交门禁与中文提交标题检查通过。定向 ESLint 无错误；StatefulSet 列表保留一条改动前已有的 `max-len` warning。
- `corepack yarn tsc -p packages/console/tsconfig.json --noEmit --pretty false`：退出 2，共 1316 条仓库既有诊断；本次 console 生产文件直接诊断为 0，shared Store 命中的是以 console tsconfig 跨包检查产生的 TS6059/TS6307 `rootDir`/文件列表错误。全项目 TypeScript 不能记录为通过。

### 131 API Server 验证

可复现脚本 [workload-statefulset-create-server-validation.cjs](./evidence/workload-statefulset-create-server-validation.cjs) 从精确提交 `6328e67aa` 的构建器生成双资源对象，并在已授权的 `default` context、`https://192.168.2.131:6443`、Kubernetes `v1.31.13+k3s1`、namespace `v4-migration-e2e` 执行两次 `kubectl create --dry-run=server`。Service 和 StatefulSet 均被接受；`serviceName`、Headless Service、selector、15432→5432 端口、partition 0、1Gi `local-path` PVC 模板和 45 秒终止宽限期全部通过结构检查，标签查询残留为 0。结构化结果见 [API 记录](./evidence/workload-statefulset-create-20261023-api-validation.json)。

本增量没有构建或推送 Console 测试镜像，没有更新 131 的 `ks-console`、rollout、核对 digest/imageID 或登录当前 SHA 页面。真实双资源创建/删除、部分成功恢复、RBAC 正反权限、namespace 隔离、缓存刷新、失败/取消、刷新/返回和 V3 功能等价性仍归 VERIFY。该提交完成时集群级三类原生入口及其余 Action 仍留在 DEV；后续入口增量见下一节。阶段保持 DEV，PR #2 保持 Draft。

## 集群级三类原生入口（2026-10-23）

代码提交 `d762c005bdf5b4c48e594a069785f1fa51e86489` 将 `/clusters/:cluster/deployments`、`statefulsets`、`daemonsets` 三个主路由从 `WorkLoadList` 的 Wujie/V3 Embed 切换到仓库已有的原生 `ApplicationWorkloads/Workloads` 列表。项目级详情路由保持不变；Jobs、CronJobs、Service、Ingress 等不属于本组合增量的入口未夹带修改。

### 实现与保留行为

1. 三个集群入口共用原生 `ListPage`、Workload Store、namespace 选择器、原生详情链接、编辑基本信息、YAML、重启、停止和删除动作。异常状态由 `StatusReason` 显示，不再渲染字面量 `reason`。
2. 创建入口复用本批次已完成的三类原生创建能力。集群列表当前选择的 namespace 会预填到弹窗；用户也可以在弹窗中更换项目。最终请求作用域从生成 payload 的 `metadata.namespace` 读取，Deployment/DaemonSet 使用单资源 mutation，StatefulSet 使用双资源 mutation。
3. namespace 尚未选择时，配置字典、Secret、PVC 和调度目标请求不会按空 namespace 发出；选择变化后按新 namespace 重新加载。标签重复检查依赖 name 和 namespace，空 namespace 时不发送检查请求。
4. 集群级权限仍使用 `{ cluster }` 进入 Cluster Rule 过滤；实际 Kubernetes API 的 namespace 级授权结果、低权限按钮与服务端 403 一致性留待 VERIFY。
5. 路由切换没有删除旧 Embed 文件，它们仍可能被其他未迁移入口引用；本增量只证明这三个主路由不再挂载该桥接。

### 实际验证

- 测试先行先取得 3 个失败：主路由仍指向 V3、原生列表没有创建接线、弹窗不支持 namespace 选择。实现后新增 6/6 通过，实际执行列表组件并分别验证 Deployment、StatefulSet、DaemonSet 的 kind、预填 namespace、payload namespace 和 Store 选择。
- `./scripts/test.sh`：精确功能内容最终为 **80 个文件、358 项通过，0 失败**。
- `corepack yarn build:packages`：退出 0，appstore、console、core、shared 全部完成，shared 633/633 minify；保留既有循环依赖和 Node 模块警告。
- 定向 ESLint：0 错误，路由文件保留 4 条改动前已有的长导入行 warning；Prettier 和 `git diff --check` 通过。
- `corepack yarn tsc -p packages/console/tsconfig.json --noEmit --pretty false`：退出 2，仍为 1316 条仓库既有诊断；本次五个生产文件没有直接诊断。不能记录为完整 TypeScript 通过。
- [可复现静态校验](./evidence/workload-cluster-native-entry-validation.cjs)绑定精确提交 `d762c005b`，三条原生路由、三类创建、namespace 作用域、空 namespace 请求保护和状态原因渲染 14 项检查通过；结构化结果见 [记录](./evidence/workload-cluster-native-entry-20261023.json)。

本增量仍处于 DEV。没有构建或推送 Console 测试镜像，没有部署 131、rollout、核对 digest/imageID，也没有在当前 SHA 上执行 Playwright。三类集群页面的真实渲染、直达/刷新/返回、namespace 切换、创建/停止/删除、RBAC、缓存和 V3 等价性必须在 VERIFY 逐类验收。其余未完成 Action 继续留在 DEV；PR #2 保持 Draft。

## 当前 V3 容器能力补齐（2026-10-24，DEV 增量）

本轮基于 `6cef32296e23490085bb7aa92f3d83f496993583` 继续修复；当前 V3 的制品和浏览器差异见 [VERIFY 纠偏](./workload-131-verify-20261024.md#负责人指出编辑设置版本能力不符后的纠偏)。旧 `release-3.4` 只用于辅助解释数据路径，不作为当前制品的源码身份声明。

本增量影响 Deployment、StatefulSet、DaemonSet 共用的创建/设置容器输入和对象构造器；Pod、Job、CronJob 未接入本次变更，不继承测试结果。

- 镜像凭据：使用已有 Secret **元数据名称**接口，以当前 cluster/namespace 和 `type=kubernetes.io/dockerconfigjson` 查询；不获取或解码 Secret.data。容器映射写入 Pod 模板注解 `kubesphere.io/imagepullsecrets`，去重凭据写入 `spec.template.spec.imagePullSecrets`，不向 Container 写入伪字段。保留无映射的既有凭据；未改动时保留顺序和注解原文，避免无意义的 Pod 模板更新。
- GPU：按运行时 `supportGpuType` 提供类型/上限控件，解析现有 requests/limits，修改时写入双方，清空时移除受控 GPU 资源，保留其他扩展资源。未验证真实 GPU 调度，不宣称设备可用。
- 应用协议：补齐 GRPC/HTTP/HTTP2/HTTPS/TCP/UDP，保留已有 SCTP；应用协议沿用 V3 的端口名称前缀，Kubernetes protocol 使用 TCP/UDP/SCTP。转换后再检查端口名称重复。
- 复用现有容器组件交互测试，补齐 GPU、镜像凭据和端口协议；对象回归覆盖创建、回填、修改、清空、无操作保持和扩展资源保留。新增资源选项 Hook 测试验证 namespace 参数、注册表类型筛选、元数据接口及卸载后不回写。

测试先行：最初 2 项能力测试失败（缺少 pullSecret/applicationProtocol）；无操作保持和转换后端口重名另有 2 项失败，修复后定向构造测试 70/70、组件交互 3/3、资源选项 1/1。最终 `./scripts/test.sh` 为 82 文件/371 项通过，0 失败；`corepack yarn build:packages` 退出 0，四个包构建完成，shared 压缩 633/633。变更生产文件 ESLint、变更文件 Prettier 与 `git diff --check` 通过。使用相同 TypeScript 配置和 compiler host 读取 HEAD 基线/当前工作区，诊断为 1326→1326，新增诊断与变更文件直接诊断均为 0；全项目 TypeScript 仍未通过。结构化证据见 [本地验证](./evidence/workload-container-settings-local-20261024.json)。

当前保持 DEV，尚未构建/部署本增量的 Console 镜像；原有 `ef3b4f1a8` 镜像不能证明本次修改通过。DS-01 分区/容器二级编辑、DS-07/08 环境变量引用及低权限配置引用控件等仍为后续任务，不声明设置整体等价。PR #2 保持 Draft。

## 设置分区与容器二级编辑（2026-10-24，DEV 增量）

基于 `b84c265902be90358a18deea320a29c9aa16b4c6`，在登记的 Workload 分支继续处理 DS-01；开工前 DEV start 身份/阶段检查已通过。当前 V3 侧栏与二级容器编辑的直接证据沿用前述当前制品/真实页面，不以旧源码决定 UI。变更仅影响三类资源共用的 `WorkloadSettingsModal`，不改变创建页的容器交互或公共基础组件。

- 设置侧栏按更新策略、容器组、存储、调度、元数据组织，使用弹窗内 refs 滚动，不写浏览器 hash/路由。全部字段保留挂载，切换导航不丢弃表单值。DaemonSet 不显示普通调度分区；StatefulSet 保留 PVC 模板。
- 容器及初始化容器使用原生摘要和二级编辑弹窗，复用现有 `ContainerInput` 全部控件。编辑草稿深拷贝；取消不回写，重新打开读取外层原值；局部确认先校验容器，再写外层草稿，只有外层确认才调用既有保存链。未知字段及 originalName 保留。
- 二级校验识别 StatefulSet 卷模板名，外层仍负责跨容器名称和完整卷关联校验，没有增加新 API 或 V3/Wujie 依赖。

TDD 首次两个编辑器用例因缺少组件失败，另两个设置用例因缺少侧栏/二级入口失败；实现后四项通过。完整 `./scripts/test.sh`：84 文件、375 项通过、0 失败。变更生产文件 ESLint、四个源码/测试文件 Prettier、`git diff --check` 通过；UI detector 未返回静态问题。TypeScript compiler host 对照基线/当前同为 1326 项诊断，新诊断 0，变更文件直接诊断 0；全项目 TypeScript 未通过。

`corepack yarn build:packages` 退出 0，四个包构建完成，shared 压缩 633/633。本地构建与文件摘要见 [本增量证据](./evidence/workload-settings-sections-local-20261024.json)。本增量仍为 DEV，尚无对应 CI 镜像、digest、131 rollout、Pod imageID 或新界面的 Playwright 验收。滚动布局、嵌套弹窗焦点/关闭、刷新/API 持久化仍需部署后验证。DS-07/08 环境引用、配置引用低权限控件及镜像选择完整交互仍未闭环，三类资源均不标记已验收。PR #2 保持 Draft。

## 配置引用低权限控件修复（2026-10-24，DEV 增量）

基于 `dd2e51c6df936499c8a69e2f896ca3ced1da3ab8`，开工前 DEV start 检查通过。既有 `ef3b4f1a8` 浏览器证据已确认 viewer 可操作配置引用控件，但 PATCH 返回 403 且服务端资源未变。根因是 `ConfigReferencePanel` 没有像详情 Action 一样调用当前资源的权限过滤，既非 Kubernetes 授权放宽，也非独立扩展故障。

复用现有 `hasPermission({ cluster, project: namespace, module, action: 'edit' })`，Deployment/StatefulSet/DaemonSet 按各自 module 判断。无 edit 权限时禁用添加、删除、类型/资源/前缀、自动重载和保存，并在 save 函数拦截；容器切换、返回、现有引用及预览仍可用。有权限用户保留原 JSON Patch URL、content-type、成功 refetch 和错误反馈链。变更只在 Workload 配置引用页面，不修改公共权限算法或其他模块。

新增两项组件用例先失败，修复后覆盖三类资源的只读控件、程序触发保存不写入、切换容器查看 Secret 引用、有权限保存以及 namespace 改变后重新限制。权限函数在单元用例中作为依赖替身，不能当作真实 RBAC 通过；实际测试账号仍需在当前 SHA 镜像部署后通过 Playwright 验证。局部修复不改变 DEV 状态或 PR #2 Draft。

本次完整回归 `./scripts/test.sh` 为 85 文件/377 项通过、0 失败，追加的按钮禁用断言定向 2/2 通过；变更生产文件 ESLint、源码/测试格式检查与 `git diff --check` 通过。TypeScript 基线/当前诊断同为 1326，新诊断及变更文件直接诊断均为 0，全项目类型检查仍未通过。

`corepack yarn build:packages` 退出 0，四个包构建完成，shared 压缩 633/633；结构化本地证据见 [权限修复记录](./evidence/workload-config-reference-permission-local-20261024.json)。本增量无新 CI 镜像、digest、Pod imageID 或部署后的 Playwright 结果。

## 环境变量引用可编辑（2026-10-24，DEV 增量）

基于 `22e65745611339817c5c1fd514915ba40d95f3c8`，DEV start 检查通过。定向读取当前 `v3dist/1.9ca3a76d71946712055c.js` 的静态 webpack 工厂 2254：UTF-16 范围 `[1893307,1900832)`，工厂 SHA256 `649c48cd1c0c8435ca495cf145e153e0ffdc01755117b894a97cd5a1e977a092`，Bundle SHA256 `924556b7889c21dbd450535163cdd63e5a6c92daad2cbdc3ec8514a005d765a3`。该工厂直接提供自定义值、ConfigMap key、Secret key 三种入口及 key 选择；未出现 fieldRef/resourceFieldRef 字样，不能由旧源码推定这两项是当前 V3 的可见入口。字段/资源引用本次作为已有 Kubernetes 配置的原生编辑支持。

三类资源共用的创建/设置容器表单新增来源类型切换、ConfigMap/Secret 名称与 key、optional、字段路径、资源字段/containerName/divisor。引用资源名仍来自当前 cluster/namespace 的元数据名称接口，本增量不读取、解码或渲染 Secret 值。**当前 key 使用输入框，尚未补齐 V3 key 下拉选择，不声明交互完全等价。**

`parseContainer` 完整深拷贝 env；构造器只写 value 或 valueFrom 之一，保持顺序与嵌套引用字段。去掉旧的“将原始 valueFrom 自动补回”逻辑，引用可以真正删除或切换成普通值；不修改源对象。envFrom optional 回填并可显式关闭，已有前缀清空和扩展字段保留行为继续保留。校验增加来源唯一、资源名/key、字段非空、资源类型和正 divisor，并保留重复变量检查。六项标题/校验文案补齐四种内置语言。

TDD：对象测试初始 70/73（新增 3 项失败），交互 0/2，语言新增 1 项失败；实现后分别 73/73、2/2、2/2 通过。完整 `./scripts/test.sh` 为 86 文件/383 项通过，0 失败。首次 ESLint 命名/定义顺序 4 项错误已修正，复查生产文件通过；TypeScript 基线/当前均 1326 项，新诊断和变更文件直接诊断均为 0，全项目类型检查未通过。`build:locales` 退出 0，仍有基线西语/繁体 configHistory 重复键警告，未在本模块夹带修复。

结构化证据见 [环境引用本地记录](./evidence/workload-environment-local-20261024.json)。仍在 DEV，尚无当前代码的镜像部署、digest/imageID、Playwright 或真实 RBAC 验收；key 下拉、镜像选择完整交互和三类资源当前 SHA VERIFY 继续处理。历史镜像 `ef3b4f1a8` 不证明本次新增控件通过。

本增量 `corepack yarn build:packages` 退出 0，四个包构建完成，shared 压缩 633/633。构建成功只记为本地检查，不改变 DEV 状态。

## 引用 key 下拉及资源选项作用域（2026-10-24，DEV 增量）

基于 `49967289db1d5191d05fa773c19f6154e6715f1d`，DEV start 检查通过。沿用当前制品工厂 2254 的 key 选择证据，复用 Kubed `AutoComplete`：可从选中资源的键名下拉选择，也保留手工输入以支持预期键或 optional 场景。加载中提示状态，失败显示错误/重试，不静默丢弃已有 key。

新增模块内 `useWorkloadEnvironmentKeys`：使用 React Query，key 包含 cluster、namespace、资源类型和名称；只在作用域完整且选中资源后请求。复用两类 Store 的 detail URL，原始响应立即转换成键名数组后才进入缓存。Secret 原始编码数据仍会经过网络（Kubernetes 没有 key-only API），但绕过会解码的 Secret mapper，不在缓存、界面或日志保存/输出值；与现有配置引用预览的处理边界一致。此前增量不取 Secret 内容的事实保留为历史，本增量明确增加了选中资源的键名读取。

补充回归复现了 `useWorkloadResourceOptions` 在作用域切换后首帧仍返回旧资源名称的问题；为选项绑定 context，返回时核对当前 cluster/namespace，匹配之前不暴露旧名称。创建页、三类设置和镜像凭据选项共用这一修复；不修改其他模块的公共 Hook。

TDD：新键名 Hook 0/2、作用域新增 1 项失败、key 下拉交互新增断言失败；修复后 Hook 2/2、作用域 2/2、交互 2/2。生命周期测试初因缺少新依赖替身出现 MODULE_NOT_FOUND，补齐隔离替身后原有 3/3 通过，不算业务缺陷。完整 `./scripts/test.sh`：87 文件/386 项通过、0 失败。变更生产文件 ESLint 通过。类型、格式、构建及摘要见 [本增量证据](./evidence/workload-environment-keys-local-20261024.json)。

模块保持 DEV。上述本地结果不替代当前 SHA 部署后的实际 key 选择、网络失败、真实权限、namespace 和缓存验收；镜像选择完整交互及三类完整 VERIFY 仍待完成。PR #2 保持 Draft，不合并。

本次 `corepack yarn build:packages` 退出 0，shared 633/633；七个变更源码/测试文件格式检查及差异检查通过。TypeScript 基线/当前同为 1326 项；全文对照有两条原有 6059/6307 诊断被替换，逐行核对只是导入说明增加本次新 Hook，一致的 rootDir/文件清单主错误未变化。没有新的主诊断或变更文件直接诊断，但全项目类型检查仍未通过。131 旧镜像的只读 Playwright 配置探测返回 `globals.config.enableImageSearch=true`，不能把镜像搜索按未启用功能豁免；此探测不算本增量 UI 验收。

## 当前制品镜像搜索与选择（2026-10-24，DEV 增量）

基于 `38536e40dd656b8a8f0552584095c4adab68ee9e`，本轮在登记的 `feature/v4-workloads` / `console-workloads` 执行 DEV start，远程同 SHA，PR #2 仍为 Open/Draft，目标 `feature/v4-migration`；其他 Worktree、历史和未跟踪产物保留。

定向核对当前 Bundle `1.9ca3a76d71946712055c.js` 的 1040、2265、2266 三个工厂，来源、UTF-16 偏移和哈希见 [提取记录](./evidence/workload-image-provenance-20261024.json)，可用 `node docs/v4-migration/evidence/workload-image-extract.cjs <尚不存在的绝对目录>` 重建。REA 成功分析了三个派生工厂，零解析错误，但语义图为 unknown/2167 项未知；不把静态结果当成运行时通过。见 [REA 摘要](./evidence/workload-image-rea-20261024.json)。首次以不受支持的 `path` 参数调用返回 schema 错误，改为实际 `input_path` 后成功，原始错误保留在摘要。

已确认版本差异：旧 `release-3.4` 的 DockerHub/Harbor 代理方法不是当前制品的方法。当前 1040 工厂使用 namespaced `images`、`repositorytags` 和 `imageconfig`；2266 通过 `q`、Secret 名称搜索，读取 `entries`；2265 提供标签分页、镜像详情及 x509 显式忽略重试。131 直接 V3 页面实际打开“编辑设置 → 容器 → 编辑容器 → 镜像搜索”，搜索 nginx 观察到 `GET /clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/images?q=nginx`，25 秒内未返回；随后取消编辑，没有保存资源。此前浏览器 API 探测也在 20 秒超时，因此搜索正向环境结果尚未闭环，不能用静态分析替代。

实现为本模块内 V4 React / Kubed / React Query 组件，无新依赖，不修改公共 Store 或服务端。保留手动完整镜像地址和凭据选择，启用搜索时增加搜索结果选择、仓库前缀、标签分页/选择、创建时间/端口/仓库/大小/层数详情、加载/空态/错误及重试。只有用户明确点击才发送 `insecure=true`，更换镜像恢复默认；失败不清空镜像或误报成功。查询 key 包含用户、cluster、namespace、Secret 和查询对象；切换作用域/凭据重新挂载选择器，尚未确认的新输入不显示旧镜像详情。

只读取选中仓库 Secret 的 `.dockerconfigjson` 以提取主机名，不调用 Secret mapper，返回和缓存不保留 auth、用户名、密码或原始 Secret。该原始编码数据会经过网络；这是本增量新增的明确读取边界，先前只取元数据名称的历史记录不改写。搜索和详情 API 只传 Secret 名称，原始后台错误不直接回显。损坏仓库配置显示错误，手动输入继续可用。

TDD：接口初始 0/7、组件 0/4、四语言新增用例失败；实现后通过。补充异常回归先复现同词无法重试和损坏仓库静默禁用，各新增一项失败后修复。最终完整 `./scripts/test.sh` 为 89 文件/400 项通过、0 失败；接口 8 项、控件 5 项和四语言共用例，原有生命周期、环境引用、三类设置与配置引用回归均保留。变更生产文件 ESLint 退出 0、无告警；Impeccable detect 返回空数组。

TypeScript 基线/当前均 1326 条。不是只比较数量：全文差异只有原有 SettingsLayout 的 6059/6307 两条诊断各增加一行本次 `workloadImages.ts` 导入路径，主错误一致、没有删除说明；变更文件直接诊断为零。全项目 TypeScript 检查仍未通过。构建和制品/部署结果以本增量结构化记录为准；本段本地测试不代表三类资源最终验收。

本增量最终 `corepack yarn build:packages` 退出 0，shared 633/633，用时 189.80 秒；`build:locales` 退出 0。源文件与上述检查绑定见 [本地结构化记录](./evidence/workload-image-local-20261024.json)。下一步先提交代码，再按 DEV 交付记录转入当前代码 VERIFY；镜像搜索环境超时和三类新制品浏览器验收继续作为未完成项。
