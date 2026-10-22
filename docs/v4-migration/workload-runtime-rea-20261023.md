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
4. 当前组合批次仍为 `REA / 分析中`；修复前不能进入业务 DEV，修复后必须以当前 SHA 重新执行构建、部署和浏览器验收。
