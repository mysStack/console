# Workload 三类资源字段行为矩阵

## 1. 取证范围与结论边界

| 项目             | 取值                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 模块             | `workloads`                                                                                                                                 |
| 资源             | Deployment、StatefulSet、DaemonSet                                                                                                          |
| 当前分支         | `feature/v4-workloads`                                                                                                                      |
| 当前代码提交     | `9cf97481c64aa8932f3afe41414057d978391a49`                                                                                                  |
| 集成基线         | `origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`                                                                  |
| 旧 V3 参考树     | `origin/release-3.4` / `175710fefeeba6ff295c2c0967b4d45b83563d26`                                                                           |
| 当前 V4 编辑入口 | `packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.tsx`                                              |
| 当前 V4 转换逻辑 | `packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts`                                                          |
| 当前阶段         | `DEV`；REA 已由项目负责人批准进入 DEV，本文继续作为字段验收清单                                                                             |
| 只读页面制品     | `feature-v4-workloads-20261022-215739-27aaeced74e8` / Pod imageID `sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179` |

旧 V3 源码用于确认历史字段和页面分区；它不证明当前 `v3dist` 的构建来源。当前 V4 源码用于确认已存在的编辑范围；存在解析或构造函数也不等于页面已经接入三类资源。当前矩阵不把未验证行为写成已实现，也不把旧镜像结果继承为当前 SHA 的验收。

状态含义：

- **已定位**：已经有固定源码或当前源码的行级事实，但不代表等价通过。
- **部分**：公共子集存在，至少一个资源或关键路径仍未覆盖。
- **未接入**：当前三类资源编辑设置没有对应的 V4 表单接入。
- **待实测**：需要当前制品或真实 API 验证默认值、请求、错误、清空或保留语义。

## 2. 公共字段行为

| 能力组                           | 旧 V3 字段/行为                                                                                                              | 旧 V3 默认值与校验                                                                                                                                        | 当前 V4 事实                                                                                               | Deployment   | StatefulSet  | DaemonSet    | 结论与后续验证                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------ | ------------ | ------------ | -------------------------------------------------------------------------------- |
| 名称、namespace、别名、描述      | `BaseInfo` 与 `ContainerSettings` 读取资源元数据；名称和 namespace 是资源上下文                                              | 名称遵循 Kubernetes 名称约束；namespace 来自当前项目                                                                                                      | `parseDeploymentSettings` 读取名称、namespace、别名、描述；Modal 仅展示名称和项目                          | 部分         | 未接入       | 未接入       | 需验证编辑回填、别名/描述清空、保留非 KubeSphere 注解                            |
| Workload 顶层 labels/annotations | 当前制品工厂 2439 的创建高级设置编辑顶层元数据；main 工厂 52 同步 workload、selector 和 Pod 模板 labels                      | label key/value 使用 Kubernetes 约束；同 cluster/namespace 调用 `checkLabels`；系统 app/别名/描述优先                                                     | Deployment 创建已实现输入、校验、重复检查及三处 labels 同步；STS/DS 创建和已有资源编辑未接入               | DEV 部分完成 | 未接入       | 未接入       | 当前 SHA 页面、持久化、重复拒绝和 RBAC 待 VERIFY；另两类创建继续 DEV             |
| Pod 模板 labels/annotations      | 当前制品工厂 2306 的设置分区只编辑模板 annotations 并隐藏保留注解；旧 AdvancedSettings 另管 workload 顶层 labels/annotations | 注解 key 使用 Kubernetes qualified name；空字符串 value 合法；保留注解由 `preservedAnnotations` 隐藏并随受控值保留                                        | 三类设置和 Deployment 创建已实现 Pod 模板 annotations；模板 labels 原样保留，workload 顶层元数据未接入     | DEV 部分完成 | DEV 部分完成 | DEV 部分完成 | 当前 SHA 持久化、浏览器回读和权限错误待 VERIFY；顶层 labels/annotations 继续 DEV |
| 副本数                           | `ContainerSettings/index.jsx:697-719`：Deployment/StatefulSet 有副本控件，DaemonSet 不渲染                                   | 默认从 `spec.replicas` 读取；创建时由资源表单提供默认值                                                                                                   | 设置 Modal 仅对 Deployment/StatefulSet 渲染并写回 replicas；DaemonSet 不解析、不渲染、不写入该字段         | DEV 已实现   | DEV 已实现   | DEV 已实现   | 伸缩、停止、恢复、批量操作及权限路径仍须逐类 VERIFY                              |
| 容器名称/类型                    | `ContainerForm/ContainerSetting` 支持 worker/init 类型和重名校验                                                             | 名称必填、Kubernetes 名称格式、最长 63、同一资源不可重复                                                                                                  | `validateContainers` 检查名称和重复；Modal 支持普通容器和 init 容器                                        | 部分         | 未接入       | 未接入       | 需验证容器重命名、顺序、init/普通容器移动和原字段保留                            |
| 镜像/拉取策略                    | 旧 V3 `ImageInput` 和镜像拉取 Secret 选择                                                                                    | 镜像必填；拉取 Secret 还受 namespace/cluster 作用域影响                                                                                                   | 当前 V4 `parseContainer/buildContainer` 支持镜像与 `imagePullPolicy`，未覆盖镜像 Secret 选择 UI            | 部分         | 未接入       | 未接入       | 需补齐三类资源入口、Secret 作用域和清空行为                                      |
| command/args                     | 旧 V3 `Commands` 写入容器 `command`、`args`                                                                                  | 可选；取消分组时涉及字段清空/保留                                                                                                                         | 当前转换支持 `command` 和 `args`，无独立设置分区                                                           | 部分         | 未接入       | 未接入       | 需测试空数组、删除字段和原始未知字段保留                                         |
| 端口                             | 旧 V3 `Ports` 支持容器端口；有 Service 时要求 servicePort                                                                    | 端口名最长 15、名称格式、同组不重复；Service 场景端口必填                                                                                                 | 当前校验检查端口范围、协议、端口名和重复；设置 Modal 未接入 Service 同步                                   | 部分         | 未接入       | 未接入       | 需验证三类资源端口回读、删除、Service 关联和错误提示                             |
| 环境变量                         | 旧 V3 `Environments` 支持字面量、ConfigMap/Secret 引用及异步错误                                                             | 环境变量名格式；引用资源按当前 cluster/namespace 查询                                                                                                     | 当前 `parseContainer` 只把有 `value` 的项作为字面量；`envFrom` 支持 ConfigMap/Secret，`valueFrom` 主要保留 | 部分         | 未接入       | 未接入       | 需验证单项引用、删除、重复名、跨 namespace 拒绝和缓存失效                        |
| 探针                             | 旧 V3 `HealthChecker/ProbeInput` 支持 liveness/readiness/startup                                                             | timing 非负；HTTP/TCP/exec 由子表单校验                                                                                                                   | 当前支持 HTTP/TCP/command 的部分字段，未覆盖 gRPC 等可能来源                                               | 部分         | 未接入       | 未接入       | 需逐项验证 handler 切换、清空、默认 timing 和非法输入                            |
| 资源请求/限制                    | 旧 V3 `ResourceLimit`，结合 LimitRange/Quota/GPU                                                                             | 受 workspace/namespace quota 和 GPU 类型限制                                                                                                              | 当前支持 requests/limits 的 CPU、memory 和额外资源保留                                                     | 部分         | 未接入       | 未接入       | 需验证 quota 错误、清空 CPU/memory、额外资源和低权限错误                         |
| volume/volumeMount               | 旧 V3 支持 PVC、emptyDir、HostPath、ConfigMap、Secret 及挂载                                                                 | volume 名称、来源、挂载路径和重复挂载校验；PVC 场景受更新策略影响                                                                                         | 当前支持上述部分来源，未知 volume 以 `preserved` 保留；Modal 只有普通卷                                    | 部分         | 仅普通卷子集 | 仅普通卷子集 | 需验证来源切换、删除联动挂载、subPath/readOnly 和 PVC 作用域                     |
| 生命周期、安全上下文与宿主时区   | 当前制品已定位生命周期、安全上下文及工厂 933/2285 的宿主时区挂载/系统卷联动                                                  | 生命周期和安全上下文按子表单校验；宿主时区固定使用只读 `/etc/localtime` 与 `host-time` 卷                                                                 | 已实现生命周期、容器安全上下文及宿主时区只读挂载/系统卷联动                                                | DEV 已实现   | DEV 已实现   | DEV 已实现   | 当前制品浏览器、真实持久化和实际 Pod 时区仍待 VERIFY                             |
| Pod securityContext              | 当前制品工厂 2298 支持用户/组与 SELinux 选项                                                                                 | 原生表单支持显式启用/清空；未编辑字段完整保留                                                                                                             | 三类资源已实现解析、表单、局部合并和清空；131 服务端 dry-run 接受                                          | DEV 已实现   | DEV 已实现   | DEV 已实现   | 当前 SHA 持久化、浏览器回读和权限错误路径仍待 VERIFY                             |
| affinity/反亲和                  | 当前制品工厂 1530 支持默认、分散、聚合、自定义规则；旧 UI 快照仅在 Deployment/StatefulSet 显示该区                           | 自定义规则要求唯一 policy、required/preferred type 和同作用域同类工作负载 target；预设使用 hostname 拓扑                                                  | Deployment 创建及 Deployment/StatefulSet 设置已接原生模型；未知高级 affinity 显式保留；DaemonSet 原样保留  | DEV 已实现   | DEV 已实现   | 保留边界完成 | 当前 SHA 持久化、调度结果、目标刷新、权限/错误和浏览器回读待 VERIFY              |
| nodeSelector/tolerations         | 当前制品工厂 2440 的非联邦创建路径为 `spec.template.spec.nodeSelector`；DaemonSet 旧设置不显示调度区                         | 节点选择器 key/value 遵守 Kubernetes label 约束                                                                                                           | Deployment 创建已接 nodeSelector；编辑设置未暴露；三类资源原有 nodeSelector/tolerations 均不因其他编辑丢失 | DEV 部分完成 | 保留         | 保留         | 编辑边界、tolerations、调度失败和页面回读继续 DEV/VERIFY                         |
| terminationGracePeriodSeconds    | 旧 V3 `TerminationSeconds` 写入 `spec.template.spec.terminationGracePeriodSeconds`                                           | 默认 30，整数，最小 0                                                                                                                                     | 三类设置均已解析、校验并写回，支持显式 0                                                                   | DEV 已实现   | DEV 已实现   | DEV 已实现   | 当前 SHA 持久化、权限错误和浏览器回读待 VERIFY                                   |
| updateStrategy                   | 旧 V3 `UpdateStrategy` 按资源分支处理                                                                                        | Deployment maxUnavailable/maxSurge 默认 25%；StatefulSet partition 默认 0；DaemonSet maxUnavailable 默认 UI 20%，切回逻辑曾写 25%，minReadySeconds 默认 0 | 已按资源类型实现 Deployment、StatefulSet、DaemonSet 策略模型及校验，并保留未编辑策略字段                   | DEV 已实现   | DEV 已实现   | DEV 已实现   | 真实持久化、默认差异、失败/取消和浏览器回读待 VERIFY                             |

## 3. StatefulSet 专有行为

| 能力                         | 旧 V3 事实                                                                                                                  | 当前 V4 事实                                                                                    | 状态       | 必须验证                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| serviceName/Headless Service | `ContainerSettings/index.jsx:175-198,453-515` 初始化 Service，端口和 selector 与模板同步，StatefulSet 设置 `clusterIP=None` | 详情存在 `editService`，但设置 Modal 没有 Service 区域；当前 `editConfigTemplate` 仍打开 YAML   | 未完成     | Service 名称、selector、端口、Headless 行为、403/409/取消和刷新          |
| volumeClaimTemplates         | `VolumeSettings/index.jsx:333-355,420-440` 使用专用模板列表，模板挂载与普通 volume 分开                                     | `parseDeploymentSettings`/`buildDeploymentSettingsResource` 只处理 `spec.template.spec.volumes` | 未接入     | 模板新增、编辑、删除限制、storageClass、accessModes、挂载回读和 API 错误 |
| replicas/partition           | 旧表单有副本控件和 `partition`                                                                                              | 当前公共 Modal 已按 StatefulSet 写 replicas 和 partition，并校验非负整数                        | DEV 已实现 | 真实持久化、策略切换、失败/取消和滚动更新行为待 VERIFY                   |

## 4. DaemonSet 专有行为

| 能力             | 旧 V3 事实                                                                 | 当前 V4 事实                                                                | 状态         | 必须验证                                                             |
| ---------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| 无 replicas 控件 | `renderReplicasControl` 对 DaemonSet 直接返回空                            | 设置 Modal 不显示或写入 replicas；Store 停止 mutation 仍需独立修复/验证     | DEV 部分完成 | 列表/详情/批量停止不能发送无效 replicas；确认正确的 DS 停止/恢复语义 |
| updateStrategy   | DaemonSet 分支提供 maxUnavailable 和 minReadySeconds，不提供 maxSurge 输入 | 设置 Modal 已按 DaemonSet 分支实现并保留未建模字段                          | DEV 已实现   | 数字/百分比类型、默认差异、切换策略和 API 持久化待 VERIFY            |
| 节点调度         | 旧 UI 快照不渲染 Pod 调度或 nodeSelector 分区                              | 设置 Modal 不显示该区；编辑其他字段时保留 nodeSelector/affinity/tolerations | DEV 保留完成 | 调度失败、页面回读及未来是否提供超出 V3 的编辑能力另行决策           |

## 5. 当前 V4 保留与清空语义

`buildDeploymentSettingsResource` 当前行为可以精确描述为：

1. 深拷贝原始资源并删除 `status`。
2. 重新构造 `containers`，对已建模字段先删除再写入；部分 `valueFrom`、额外资源和 probe handler 字段从原对象合并回来。
3. `initContainers` 为空时删除整个 `spec.template.spec.initContainers`。
4. `volumes` 为空时删除整个 `spec.template.spec.volumes`；未建模 volume 使用 `preserved` 时保留原对象。
5. Deployment/StatefulSet 按表单差异写回 replicas 和更新策略；DaemonSet 不写 replicas，单独处理自身更新策略。
6. Deployment/StatefulSet 仅在用户修改 Pod 调度时重建可安全表达的 affinity；未知高级配置使用 `preserved` 原样保留，DaemonSet 永不由该分区重写 affinity。

公共转换函数已经为策略、调度、安全、终止和 Pod 模板注解建立资源类型分支及保留/清空回归；仍未闭环的是 StatefulSet/DaemonSet 创建与已有资源顶层元数据编辑、StatefulSet Service/PVC 模板、DaemonSet 停止语义、配置引用、集群级入口和完整 Action/RBAC。

## 6. DEV/VERIFY 剩余清单

| 维度             | 需要的材料                                                           | 当前状态                     |
| ---------------- | -------------------------------------------------------------------- | ---------------------------- |
| 字段             | 本文矩阵逐项绑定当前 V4 代码、旧 V3 行为和三类资源差异               | 已建立，待逐项运行时校准     |
| 默认值/校验      | 对策略、探针、端口、资源、卷、调度、安全和终止字段记录成功与非法输入 | 部分本地完成，真实环境待补   |
| API/Store/Action | 三类资源的 method、URL、body、成功/失败/取消、冲突和列表失效         | 部分静态完成，运行时未闭环   |
| RBAC/作用域      | 项目、集群、namespace、低权限正反路径和跨 namespace 隔离             | 未完成                       |
| 配置引用         | 移除 `useV3action`/Wujie DOM 依赖并替换为原生组件/Store              | 未完成                       |
| 集群级入口       | 三类集群列表不再挂载 `/consolev3`                                    | 未完成                       |
| 负责人复核       | `module-execution.json.rea.review` 填入真实复核人、日期和绑定依据    | 已完成，负责人已批准进入 DEV |

REA 已由项目负责人批准进入 DEV。本文的未完成项继续约束 DEV 完成和 VERIFY 验收；当前仍未达到部署门禁，不能把单元测试或 server dry-run 写成模块验收通过。

## 7. 真实 V3 页面只读复核

在 131 已部署的旧 V3 页面上使用 Playwright 进行只读复核，未点击“确定”、未发起资源写入：

| 项目           | 观察结果                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 页面           | StatefulSet 详情 `v4-watch-sts-20261022-01`，项目 `v4-migration-e2e`                                                                          |
| 制品           | `feature-v4-workloads-20261022-215739-27aaeced74e8`，Pod imageID 为 `sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179` |
| 入口           | “更多操作 → 编辑设置”打开 V3 设置弹窗，页面 URL 为 `/consolev3/clusters/host/projects/v4-migration-e2e/statefulsets/...`                      |
| 设置分区       | 更新策略、容器、容器组优雅终止、存储、容器组调度规则                                                                                          |
| 更新策略默认值 | 滚动更新；容器组副本分组序号为 `0`                                                                                                            |
| 页面状态       | Playwright snapshot 显示弹窗和字段正常渲染；本次无资源变更                                                                                    |
| 证据限制       | 这是旧 V3 部署制品的行为输入，不是 `feature/v4-workloads` 当前 SHA 的部署验收；只读打开弹窗不能证明保存请求、RBAC 或错误路径                  |

本次复核使用的入口命令：

```bash
bash /home/bruce/.codex/skills/playwright/scripts/playwright_cli.sh tab-list
bash /home/bruce/.codex/skills/playwright/scripts/playwright_cli.sh snapshot
bash /home/bruce/.codex/skills/playwright/scripts/playwright_cli.sh click '[data-test="detail-more"]'
bash /home/bruce/.codex/skills/playwright/scripts/playwright_cli.sh click '[data-test="detail-editConfigTemplate"]'
bash /home/bruce/.codex/skills/playwright/scripts/playwright_cli.sh snapshot
```

## 8. 可复现来源命令

```bash
git rev-parse origin/release-3.4
git show origin/release-3.4:src/components/Forms/Workload/ContainerSettings/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/ContainerSettings/UpdateStrategy/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/AdvanceSettings/index.jsx
git show origin/release-3.4:src/components/Forms/Workload/VolumeSettings/index.jsx
nl -ba packages/console/src/pages/projects/components/WorkloadCreateModal/WorkloadSettingsModal.tsx
nl -ba packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.ts
```
