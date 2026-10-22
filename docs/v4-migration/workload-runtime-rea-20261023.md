# Workload 运行时 REA 取证记录（2026-10-23）

> 本文记录 131 测试环境中当前已部署制品的浏览器观察结果，只用于校准 REA，不代表当前 `feature/v4-workloads` 已完成 VERIFY。执行时分支 HEAD 为 `54de7885cdd4e75f4d7ffb55b74f38444c4a2498`，131 实际部署镜像仍为 `feature-v4-workloads-20261022-215739-27aaeced74e8`，Pod imageID 为 `sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179`，两者不是本轮当前 SHA。

## 环境与登录

- 入口：`http://192.168.2.131:30880`。
- 登录凭据通过交互式 Bash 加载 `/home/bruce/.bashrc` 的专用测试账号环境变量，未将账号、密码写入本文、截图或测试配置。
- 登录后页面进入 `/dashboard`，顶部显示平台管理员身份；这只证明本轮浏览器会话有效，不替代低权限账号验证。
- 集群实际名称为 `host`。使用不存在的 `default` 集群直达 URL 会进入错误页并提示集群不存在，说明测试路由不能把 `default` 当作当前集群别名。

## 项目列表和作用域

在 `test-workspace / host / v4-migration-e2e` 直达：

`/test-workspace/clusters/host/projects/v4-migration-e2e/deployments`

页面渲染为原生 Workload 页面，显示 Deployment、StatefulSet、DaemonSet 三个单选入口。Deployment 列表只显示 `v4-watch-20261022-02`，项目列为 `v4-migration-e2e`，本次页面观察没有出现其他 namespace 的 Workload。该结果只覆盖当前 admin 会话和当前已部署镜像，仍需在当前 SHA 以及低权限账号下重复。

Network 记录显示该列表使用带完整作用域的请求并返回 200：

- Deployment：`GET /clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/deployments?sortBy=createTime&limit=10&page=1`。
- StatefulSet：`GET /clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/statefulsets?sortBy=createTime&limit=10&page=1`。
- DaemonSet：`GET /clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/daemonsets?sortBy=createTime&limit=10&page=1`。

因此当前部署制品的三类项目列表作用域已取得浏览器 Network 证据；该证据仍受旧镜像身份限制，不等同于当前 SHA 的 VERIFY。

## 三类详情和编辑入口

### Deployment

直达资源：

`/test-workspace/clusters/host/projects/v4-migration-e2e/deployments/v4-watch-20261022-02`

页面显示资源状态、修改记录、元数据、环境变量、配置引用和事件页签；“更多操作”显示回退、编辑自动扩缩、编辑设置、编辑 YAML、重新创建和删除。点击“编辑设置”后出现原生“编辑设置”对话框，实际渲染名称、项目、副本数量、容器组设置、容器镜像、镜像拉取策略、命令/参数、端口、环境变量、配置资源引用、健康检查、资源限制、卷挂载、初始化容器和存储卷等输入。

该结果证明当前已部署制品存在原生 Deployment 设置入口和页面渲染；没有执行保存、删除或其他资源变更，因此不能证明 payload、PUT、并发冲突、缓存刷新或完整字段等价。

### StatefulSet

直达资源：

`/test-workspace/clusters/host/projects/v4-migration-e2e/statefulsets/v4-watch-sts-20261022-01`

页面显示资源状态、修改记录、元数据、环境变量、配置引用和事件，并显示“编辑服务”。“更多操作”中显示“编辑设置”和“编辑 YAML”。点击“编辑设置”后实际打开的对话框标题为**编辑 YAML**，内容为 StatefulSet YAML 编辑器；没有出现 Deployment 原生设置表单，也没有进入单独的 Service/卷模板设置表单。

该结果关闭了“StatefulSet 编辑设置当前仍转 YAML”的运行时未知，属于当前旧部署制品事实，后续 DEV 必须修复并在当前 SHA 部署后重新验证。

### DaemonSet

直达资源：

`/test-workspace/clusters/host/projects/v4-migration-e2e/daemonsets/v4-watch-ds-20261022-01`

页面显示资源状态、修改记录、元数据、环境变量、配置引用和事件；“更多操作”显示回退、编辑设置、编辑 YAML、重新创建和删除。点击“编辑设置”后实际打开的对话框标题为**编辑 YAML**，没有出现原生设置分区。

该结果关闭了“DaemonSet 编辑设置当前仍转 YAML”的运行时未知。页面还显示 DaemonSet 的期望副本数和当前副本数均为 1，但这不能证明 DaemonSet 可以按 Deployment 语义执行副本伸缩；停止语义仍需单独按资源类型验证。

从该页面的浏览器 Network 记录还观察到：详情请求为
`GET /clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/daemonsets/v4-watch-ds-20261022-01`，返回 200；在 YAML 对话框确认未改变内容后，浏览器向同一详情 URL发送 `PUT`，返回 200，随后再次 GET 详情。该请求证明当前已部署制品的 DaemonSet YAML 保存使用完整资源 PUT；它不是当前分支 SHA 的实现验证，也不能替代原生设置表单的字段、并发、RBAC 和缓存验收。

源码侧还确认项目 DaemonSet 列表和集群 Workload 列表都挂载了 `useBatchStopDeploymentMutation`，共享 Store 的停止实现固定向 `spec.replicas` 写入 0。Kubernetes DaemonSet 不使用 Deployment 的副本伸缩模型；该组合是当前进入 DEV 前必须先处理的高风险差异，当前没有执行停止操作，也没有把它写成已验证缺陷修复。

## 当前页面错误边界

本轮页面加载时控制台仍出现已知扩展初始化错误，包括 `getExtensionConsoleV3Embed is not a function`，以及其他扩展的 `ConfigConstants` 错误。它们来自已安装扩展资源，不属于本轮 Workload 业务代码；本记录保留现象，不将其作为 Workload 通过依据，也不把它自动改成 Workload 缺陷结论。

## 2026-10-23 集群级入口和旧 V3 设置复核

本轮使用已存在的 131 浏览器登录会话进行只读页面观察，没有创建、编辑、删除或伸缩资源。浏览器会话显示为 `admin / platform-admin`；该会话只用于 REA 取证，不能替代低权限 UI 验证。

部署身份经 Kubernetes 只读回读为：`ks-console` 使用镜像 tag `feature-v4-workloads-20261022-215739-27aaeced74e8`，digest 为 `sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179`，Pod Ready 且 imageID 与该 digest 一致。该镜像不是当前分支 `f2541f16c1040f70773c6e5fb744e984d21e1c4e`，所以以下结果只属于当前已部署旧 SHA 的 REA 输入，不属于当前分支 VERIFY。

集群级路由复核结果：

- 直达 `/clusters/host/workloads` 后重定向到 `/clusters/host/deployments`，页面显示 V4 Banner/Tab 外壳及嵌入的 V3 Workload 列表，提供 Deployment、StatefulSet、DaemonSet 三个入口。
- `/clusters/host/deployments`、`/clusters/host/statefulsets`、`/clusters/host/daemonsets` 三个列表都能渲染对应资源类型，并分别请求 `GET /clusters/host/kapis/resources.kubesphere.io/v1alpha3/deployments`、`statefulsets`、`daemonsets`。
- 三类列表的资源名称和项目链接仍指向 `/consolev3/clusters/host/projects/...`；页面加载过程中还实际请求 `/consolev3/dashboard` 和 `/dist/v3dist/*`。集群 StatefulSet 页面实际检测到 1 个 `wujie-app`；活跃路由挂载 `Workload/Workloads/Embed/index.tsx`，其 URL 由当前 tab 插值生成。因此列表本身仍是 V3，不能写成已接通原生 `ListPage`。单独的 `StatefulSets/Embed.tsx` 和 `DaemonSets/Embed.tsx` 有 URL 互换，但不是这条活跃路由使用的组件，本轮未复现主入口跳错资源。

旧 V3 详情和“编辑设置”页面复核结果：

| 资源        | 旧 V3 设置分区/字段观察                                                                                                                       | 详情请求                                                                                            |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Deployment  | `更新策略`、`容器`、`存储`、`容器组调度规则`、`容器组优雅终止`；更新策略可见 `最大不可用容器组数量` 和 `最大多余容器组数量`，当前值均为 `25%` | `GET /clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/deployments/v4-watch-20261022-02`      |
| StatefulSet | `更新策略`、`容器`、`容器组优雅终止`、`存储`、`容器组调度规则`；更新策略可见 `容器组副本分组序号`，当前值为 `0`；详情另有 `编辑服务`          | `GET /clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/statefulsets/v4-watch-sts-20261022-01` |
| DaemonSet   | `更新策略`、`容器组`、`存储`、`容器组优雅终止`；更新策略可见 `最大不可用容器组数量` 和 `容器组就绪最短运行时长（s）`，当前值为 `1` 和 `0`     | `GET /clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/daemonsets/v4-watch-ds-20261022-01`    |

这批页面证据确认了三类资源的特有分区和已有对象的当前值；当前值不能作为空对象的默认值。保存策略的有限请求证据见下一节，完整字段、RBAC 和缓存仍未闭环。当前 V4 代码的 StatefulSet、DaemonSet 编辑设置仍进入 YAML，与上述旧 V3 设置分区形成已确认的 DEV 差异。浏览器原始 snapshot/console 输出保留在本地 `.playwright-cli/`，未加入 Git。

## 更新策略草稿、请求和取消的定向证据

取证输入为 `45f104b6e18215bb6b4f273e1dd16da30107188a`，V3 tree 为 `1e499d92e11374e26c76f5e13be45251602bd596`；部署仍是上述旧镜像。使用[限定请求捕获脚本](./evidence/workload-strategy-capture-20261023.js.txt)拦截浏览器非 GET/HEAD/OPTIONS 请求，返回含 `REA_CAPTURE_ONLY` 标记的模拟 409，随后取消。脚本不保存请求头、Token 或完整容器/环境变量数据。[运行时摘录](./evidence/workload-strategy-20261023-runtime.json)保存限定字段及前后 API 回读摘要。

| 资源        | 草稿修改与浏览器生成的 PUT                                                                               | 边界                                                                                                                         |
| ----------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Deployment  | `spec.strategy.rollingUpdate.maxUnavailable=2`（number）、`maxSurge="30%"`（string）                     | 保留 `resourceVersion`，对象含 `replicas`                                                                                    |
| StatefulSet | `spec.updateStrategy.rollingUpdate.partition=1`（number）                                                | 保留 `resourceVersion` 和 `replicas/serviceName`；此 fixture 的 specKeys 不含 `volumeClaimTemplates`，未证明卷模板保留或编辑 |
| DaemonSet   | `spec.updateStrategy.rollingUpdate.maxUnavailable="2"`（string）、`maxSurge=0`、`spec.minReadySeconds=1` | 保留 `resourceVersion`，不含 `replicas`；字符串类型是实际捕获结果，不推定服务端接受                                          |

三类设置请求均针对 `/clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/{kind}/{name}`，每次只捕获一次 PUT。页面流程分两层：先点分区勾选保存草稿，再点外层“确定”；分区保存前外层按钮禁用，之后启用。模拟 409 后显示标记错误，随后取消关闭。早期直接点击禁用按钮的超时是测试步骤错误，不登记为产品缺陷；定位隐藏 radio 的等待超时也不计页面失败。

三类资源的 `resourceVersion` 和规范化 `spec` SHA-256 在取证前后均相同，具体值见 JSON。它证明本次观察没有持久化设置变更；模拟 409 只覆盖前端错误反馈，不能冒充实际 API Server 冲突、持久化、缓存或低权限验证。

另外，DaemonSet 容器新增页面已观察到普通/初始化容器、镜像、CPU/内存、端口、拉取策略、三类探针、生命周期、命令参数、环境变量及引用、安全上下文和宿主时区；存储页面可见 PVC/临时卷/HostPath 和 ConfigMap/Secret 挂载入口。这里只确认可见入口，没有验证全部嵌套字段、写回或跨资源等价。

## 低权限 API 矩阵

本轮在 `v4-migration-e2e` 中创建了专用 viewer 用户 `v4-workload-viewer-20261023`，并只绑定该 namespace 的 `viewer` 项目角色。使用 Kubernetes `auth can-i` 做非破坏性授权核对，未输出该用户密码：

| 资源        | 当前 namespace 的 list/get/watch | 当前 namespace 的 patch/delete | all-namespaces 的 list/get/watch |
| ----------- | -------------------------------- | ------------------------------ | -------------------------------- |
| Deployment  | 允许                             | 拒绝                           | 拒绝                             |
| StatefulSet | 允许                             | 拒绝                           | 拒绝                             |
| DaemonSet   | 允许                             | 拒绝                           | 拒绝                             |

这组结果证明了测试账号的预期授权边界和 namespace 级拒绝路径，但尚未在浏览器中使用该账号登录，也未将拒绝操作发送到当前 SHA 的 Console 页面；因此不能替代低权限 UI 和实际 API 请求证据。该用户和 RoleBinding 属于本轮专用测试 fixture，完成 VERIFY 清理时一并删除。

## 结论与下一步

1. 运行时已确认 131 的集群标识、项目路由、三类详情页和当前部署制品的实际页面形态。
2. Deployment 的原生编辑设置入口可渲染；StatefulSet、DaemonSet 的“编辑设置”仍打开 YAML，这是明确的 DEV 缺口。
3. 本轮没有执行资源创建、编辑、删除、伸缩或部署，未取得当前 SHA 的部署链路、Network 请求、RBAC 正反和缓存失效证据。
4. 当前组合批次仍为 `REA / 分析中`；REA 证据闭环前不能进入业务 DEV，修复后必须以当前 SHA 重新执行构建、部署和浏览器验收。
