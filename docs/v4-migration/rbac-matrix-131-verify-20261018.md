# ConfigMap、Secret、ServiceAccount 完整 RBAC 组合验证

> 验证日期：2026-10-18（上海时间）  
> 目标环境：`192.168.2.131:30880`，Kubernetes context `default`  
> 测试 namespace：`v4-migration-e2e`  
> 测试企业空间：`test-workspace`  
> 验证方式：真实 Playwright 登录 + 浏览器会话内 Kubernetes API 请求  
> 扩展运行时错误：按负责人指令继续延期，不纳入本轮结论

## 制品与部署

本轮验证的是已部署代码提交 `8c6262d97` 对应的镜像：

- 镜像 tag：`feature-v4-configmaps-secrets-20261018-195453-8c6262d97d13`
- manifest digest：`sha256:bf6577ccdaddd314e478b4ba7235865e695a705c1f50cc7ec132152566b3652c`
- Deployment：`kubesphere-system/ks-console`，generation/observedGeneration `515/515`
- Pod：`ks-console-959cd4457-vxk5m`，Running/Ready
- Pod imageID：与上述 manifest digest 一致

本轮只在 `v4-migration-e2e` 创建临时账号、IAM 绑定和资源。临时 ConfigMap、Secret、ServiceAccount 均在每个账号场景结束后删除；测试 Secret 使用非敏感值，未写入日志、截图或文档。

## 账号组合

| 账号组合        | 企业空间权限            | 项目权限   | 集群权限         | 预期边界                                |
| --------------- | ----------------------- | ---------- | ---------------- | --------------------------------------- |
| `viewer`        | `test-workspace-viewer` | `viewer`   | 无               | 项目资源只读                            |
| `operator`      | `test-workspace-viewer` | `operator` | 无               | 项目资源读写、ServiceAccount 角色 PATCH |
| `admin`         | `test-workspace-viewer` | `admin`    | 无               | 项目资源读写、ServiceAccount 角色 PATCH |
| `workspaceonly` | `test-workspace-viewer` | 无         | 无               | 企业空间可进入，但项目资源只读          |
| `projectonly`   | 无                      | `viewer`   | 无               | API 可读，Console 项目入口拒绝          |
| `clusterviewer` | `test-workspace-viewer` | 无         | `cluster-viewer` | 集群级资源只读，项目写入拒绝            |

账号名、绑定和临时凭据均为本轮专用数据；凭据没有写入仓库、报告或输出。

## 实际浏览器与 API 结果

状态码均来自已登录账号的浏览器会话。项目资源 API 使用：

- `GET/POST /api/v1/namespaces/v4-migration-e2e/configmaps`
- `GET/POST /api/v1/namespaces/v4-migration-e2e/secrets`
- `GET/POST /api/v1/namespaces/v4-migration-e2e/serviceaccounts`
- 详情更新使用 `PUT`，ServiceAccount 角色使用 Kubernetes strategic merge `PATCH`，删除使用 `DELETE`

| 账号组合        | 登录 | 项目页面      | ConfigMap GET/POST/PUT/DELETE | Secret GET/POST/PUT/DELETE | ServiceAccount GET/POST/PUT/PATCH/DELETE | 集群页面      | 集群级 GET    |
| --------------- | ---- | ------------- | ----------------------------- | -------------------------- | ---------------------------------------- | ------------- | ------------- |
| `viewer`        | 通过 | 项目路由正常  | `200/403/403/403`             | `200/403/403/403`          | `200/403/403/403/403`                    | `/errors/403` | `403/403/403` |
| `operator`      | 通过 | 项目路由正常  | `200/201/200/200`             | `200/201/200/200`          | `200/201/200/200/200`                    | `/errors/403` | `403/403/403` |
| `admin`         | 通过 | 项目路由正常  | `200/201/200/200`             | `200/201/200/200`          | `200/201/200/200/200`                    | `/errors/403` | `403/403/403` |
| `workspaceonly` | 通过 | 项目路由正常  | `200/403/403/403`             | `200/403/403/403`          | `200/403/403/403/403`                    | `/errors/403` | `403/403/403` |
| `projectonly`   | 通过 | `/errors/403` | `200/403/403/403`             | `200/403/403/403`          | `200/403/403/403/403`                    | `/errors/403` | `403/403/403` |
| `clusterviewer` | 通过 | 项目路由正常  | `200/403/403/403`             | `200/403/403/403`          | `200/403/403/403/403`                    | 集群路由正常  | `200/200/200` |

说明：

1. `operator` 和 `admin` 的 `POST` 返回 `201`，`PUT/PATCH/DELETE` 返回 `200`，每个资源均在浏览器会话内创建、修改、删除并复核清理。
2. `viewer`、`workspaceonly` 和 `clusterviewer` 的项目读请求为 `200`，所有项目写请求为 `403`；`projectonly` 的原生 Kubernetes 项目读请求为 `200`，但没有企业空间成员身份时 Console 项目入口直接返回 `/errors/403`。
3. `clusterviewer` 的集群级 ConfigMap、Secret、ServiceAccount 列表 GET 均为 `200`，集群页面正常；它没有项目写权限。
4. 角色 PATCH 采用正确的 strategic merge patch media type。`operator`、`admin` 返回 `200`，只读和无项目写权限组合返回 `403`。

## 浏览器证据

每个账号均从 `/login` 真实登录后访问项目路由和集群路由。页面截图保存在未提交的本地目录：

`output/playwright/rbac-matrix-20261018/`

- `viewer-cluster-configmaps.png`
- `operator-cluster-configmaps.png`
- `admin-cluster-configmaps.png`
- `clusterviewer-cluster-configmaps.png`

截图和页面检查没有包含密码、Token 或 Secret 明文。

## 清理核验

- `v4-rbac-*` ConfigMap、Secret、ServiceAccount：均已删除，namespace 内没有残留。
- 本轮临时账号和 IAM 绑定：仍保留到本轮所有验证结束，随后统一删除。
- `v4-migration-e2e` namespace：保留。
- `test-wes` 和其他已有 namespace：未修改。

## 结论

本轮关闭了三个模块的完整 RBAC 组合中“企业空间、项目、集群只读/项目读写”的实际状态码和 Console 入口证据。ConfigMap、Secret、ServiceAccount 的低权限正反路径和项目/集群权限边界已取得部署后证据；模块总体仍不能标记为“已验收”，因为全部 V3 功能逐项等价性、真实 API Server 故障和其他错误态组合仍未完成。

## 2026-10-19 作用域覆盖审计

为避免“完整 RBAC 组合”被误解为全部平台功能已经覆盖，本记录的实际覆盖范围明确如下：

| 作用域/功能                                       | 当前证据                                                                       | 状态                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------- |
| 企业空间成员 → 项目资源                           | `workspaceonly`、`viewer`、`operator`、`admin` 的真实登录和 API 状态码         | 已验证               |
| 项目只读/读写 → ConfigMap、Secret、ServiceAccount | 六种账号组合覆盖项目 GET、POST、PUT/PATCH、DELETE 及 ServiceAccount 角色 PATCH | 已验证               |
| 集群只读 → 三类集群资源                           | `clusterviewer` 的集群路由和三类资源 GET                                       | 已验证               |
| 平台/全局角色 → 三类项目资源                      | 本记录未建立独立平台角色组合                                                   | 未验证               |
| 联邦资源作用域                                    | 当前集群没有可用 FederatedProject/FederatedResource API 或 fixture             | 环境不可执行，未通过 |
| DevOps 作用域                                     | `test-workspace` 没有可选集群，无法建立 DevOps 项目 fixture                    | 环境不可执行，未通过 |
| 扩展中心/扩展 Action 作用域                       | 扩展运行时错误按负责人指令延期                                                 | 暂缓，未通过         |

因此，“完整”仅表示本记录覆盖的 ConfigMap、Secret、ServiceAccount 项目/集群六种权限组合已取得实际证据；平台、联邦、DevOps、扩展作用域不能沿用这些结果推断通过。三类资源模块的 RBAC 组合证据已完成，但全量 V3 功能等价性和跨功能作用域门禁仍未完成。

## 2026-10-19 平台/扩展路由只读补测

为补齐平台作用域的入口证据，本轮创建了临时用户、临时 GlobalRole 和 GlobalRoleBinding，并使用当前测试账号密码通过真实浏览器登录。临时角色引用了 `global-view-workspaces`、`global-view-clusters`、`global-view-users`、`global-view-roles` 模板；KubeSphere 的聚合控制器实际把全局模板规则展开到该临时角色，因此本轮只把它作为平台路由渲染证据，不能作为最小权限拒绝证据。

该临时账号实际打开并渲染了以下路由：`/access/workspaces`、`/clusters`、`/access/accounts`、`/extensions/management` 和 `/settings/base-info`；没有执行任何写操作。临时用户、GlobalRole 和 GlobalRoleBinding 已删除，并分别用 Kubernetes API 复核为不存在。

这次补测只证明平台/扩展入口在该临时聚合角色下可以渲染，不能关闭平台写权限、扩展 Action、联邦资源或完整 V3 等价性。扩展初始化运行时错误仍按负责人指令暂缓。

## 2026-10-20 平台只读与项目隔离组合补测

本轮在当前 131 部署制品上新增两个作用域组合，使用一次性用户和临时绑定，测试密码只保存在权限为 `600` 的临时文件中，未写入日志或文档。

| 组合          | 入口与读取                                                                                       | 写入拒绝                                                              | 实际结果 |
| ------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- | -------- |
| 平台只读      | `/access/workspaces`、`/clusters` 正常渲染；工作空间列表和集群列表为 `200`；平台用户列表为 `200` | 创建用户、创建工作空间、创建集群均为 `403`                            | 已验证   |
| 仅项目 viewer | 直接项目 ConfigMap GET 为 `200`；工作空间详情 GET 为 `200`                                       | 项目 ConfigMap POST 为 `403`；直达项目 Console 路由进入 `/errors/403` | 已验证   |

平台只读角色由 `global-view-workspaces`、`global-view-clusters`、`global-view-users` 和 `global-view-roles` 的实际规则展开组成；创建临时 GlobalRole 时最初遗漏必填 `rules` 导致对象被拒绝，随后按 RoleTemplate 规则展开后重新验证。该过程没有修改内置角色或已有用户。

临时 GlobalRole、GlobalRoleBinding、WorkspaceRoleBinding、项目 RoleBinding 和用户均已删除，并复核资源不存在。该补测关闭了平台只读的读/写拒绝和项目独立账号的页面/API边界证据，但联邦、DevOps、扩展 Action 以及全部 V3 Action 等价性仍未完成，不能把 RBAC 总体标记为完整通过。

## 2026-10-20 DevOps 作用域与扩展安装状态补测

本轮使用临时 `dev-workspace` viewer 账号和平台管理员账号分别打开 `/workspaces/dev-workspace/devops`，并通过真实浏览器检查 DevOps API 和创建弹窗。

| 检查项           | viewer                                                                                    | platform-admin                          | 结论                                  |
| ---------------- | ----------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------- |
| DevOps 页面      | 页面可渲染，显示“暂无数据 / 请选择集群”                                                   | 页面可渲染，显示“暂无数据 / 请选择集群” | 入口已验证                            |
| 集群选择         | `host` 显示“未安装 DevOps”                                                                | `host` 显示“未安装 DevOps”              | 集群存在但缺少 DevOps 扩展            |
| DevOps 列表 GET  | `GET /kapis/devops.kubesphere.io/v1alpha3/workspaces/dev-workspace/namespaces` 返回 `404` | 同一 GET 返回 `404`                     | 不是账号权限差异，是后端入口不可用    |
| DevOps 创建 POST | 返回 `403`                                                                                | 返回 `404`                              | viewer 受到权限拒绝，管理员也无法创建 |
| 创建弹窗取消     | 弹窗打开后未提交，点击取消关闭                                                            | 弹窗打开后未提交，点击取消关闭          | 已验证无状态变更                      |

该结果确认 DevOps 的成功、失败、取消和资源刷新无法在当前集群闭环，因为 `host` 未安装 DevOps 扩展且对应 API 返回 `404`。不能把空列表或创建弹窗渲染标记为 V3 等价通过；该项记录为“环境阻塞，未通过”，不修改集群扩展安装状态。

## 2026-10-20 联邦项目与 Edge 作用域只读补测

本轮在当前 131 部署制品上使用已登录的 `platform-admin` 账号和真实 Playwright 浏览器，只执行入口渲染与请求读取，不提交创建操作。

| 作用域       | 浏览器入口                                     | 实际证据                                                                                                                                       | 状态         |
| ------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| 联邦项目     | `/workspaces/test-workspace/federatedprojects` | 页面正常渲染“联邦项目”和“创建”入口；列表显示“未发现联邦项目”；工作空间 namespace 请求返回 `200`                                                | 部分验证     |
| 联邦项目创建 | 创建弹窗                                       | 名称、别名、描述和集群字段正常渲染；`host` 显示为主集群，但“添加集群”按钮为禁用状态；本轮未点击确定、未创建资源                                | 未闭环       |
| Edge 节点    | `/clusters/host/edgenodes`                     | 页面正常渲染“边缘节点”和“添加”入口；边缘节点列表请求 `GET .../nodes?...labelSelector=node-role.kubernetes.io/edge=` 返回 `200`，页面为空数据态 | 部分验证     |
| V3 兼容加载  | 联邦项目页面                                   | 页面请求 `/consolev3/dashboard` 及 `dist/v3dist/*` 资源均返回 `200`                                                                            | 未完成原生化 |

集群 API 资源盘点此前已确认当前集群没有 KubeSphere FederatedProject/FederatedResource、EdgeWorkload 等可用于建立真实 fixture 的 API/CRD。本轮没有创建联邦项目、Edge 节点或其他测试资源，也没有将空数据态、禁用按钮或入口渲染写成 RBAC/功能等价通过。联邦和 Edge 的成功、失败、取消、刷新、低权限及 V4 替代行为仍未验证。

## 2026-10-20 Workload 低权限组合补测

为补齐原生 Workload 详情与权限边界，本轮在 131 当前制品上创建临时账号 `v4-workload-viewer-20261020`，绑定 `test-workspace-viewer` 和 `v4-migration-e2e` 项目 `viewer` 角色。使用真实 Playwright 登录后，分别直达 Deployment、StatefulSet、DaemonSet 详情页：三类页面均能渲染资源状态、修改记录、元数据、环境变量、配置引用和事件入口；页面没有显示“编辑信息”或“更多操作”等写入口。

在同一浏览器会话中对三个临时 Workload 对象执行 Kubernetes API 请求，状态码如下：

| 资源        | GET 详情 | POST 创建 | PUT 更新 | PATCH 更新 | DELETE 删除 |
| ----------- | -------: | --------: | -------: | ---------: | ----------: |
| Deployment  |      200 |       403 |      403 |        403 |         403 |
| StatefulSet |      200 |       403 |      403 |        403 |         403 |
| DaemonSet   |      200 |       403 |      403 |        403 |         403 |

该结果补齐 A02～A04 的低权限读写拒绝证据，但只覆盖当前项目 viewer 组合；不代表全部 RBAC 作用域、所有错误态或全部 V3 行为等价性已完成。临时 Workload、用户、WorkspaceRoleBinding 和项目 RoleBinding 均已删除，`v4-migration-e2e` 清理后只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount。

## 2026-10-20 Workload operator 正向 RBAC 补测

为补齐 A02～A04 当前项目 operator 组合，在 `test-workspace` 创建临时 operator 用户并绑定 `v4-migration-e2e` 项目 `operator` Role。使用真实浏览器登录后分别直达临时 Deployment、StatefulSet、DaemonSet 详情页，三类页面均正常渲染资源状态、修改记录、元数据、环境变量、配置引用和事件入口。

同一浏览器会话内对三类 Workload 执行 GET、PUT、PATCH、POST、DELETE，状态码均为：

| 资源        | GET | PUT | PATCH | POST | DELETE |
| ----------- | --: | --: | ----: | ---: | -----: |
| Deployment  | 200 | 200 |   200 |  201 |    200 |
| StatefulSet | 200 | 200 |   200 |  201 |    200 |
| DaemonSet   | 200 | 200 |   200 |  201 |    200 |

POST 创建对象、PUT/PATCH 修改对象和 DELETE 均在浏览器会话中完成并清理。临时用户、WorkspaceRoleBinding、项目 RoleBinding 和三类测试 Workload 已删除，namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。

该证据补齐 A02～A04 当前项目 operator 的正向读写 API 边界；viewer 拒绝证据已在本记录前文，其他作用域、admin 独立组合、完整错误态和全部 V3 等价仍未完成。

## 2026-10-20 Workload workspaceonly 与 clusterviewer 作用域补测

为核对 A02～A04 的作用域边界，在 `test-workspace` 创建两个临时账号，均通过真实 Playwright 登录并访问同一临时 Deployment 详情路由：

| 组合            | 绑定                                       | 项目详情路由  | GET | POST | PUT | PATCH | DELETE |
| --------------- | ------------------------------------------ | ------------- | --: | ---: | --: | ----: | -----: |
| `workspaceonly` | 仅 `test-workspace-viewer`                 | `/errors/403` | 403 |  403 | 403 |   403 |    403 |
| `clusterviewer` | `test-workspace-viewer` + `cluster-viewer` | 正常渲染      | 200 |  403 | 403 |   403 |    403 |

`workspaceonly` 没有项目资源读取权，不能沿用 ConfigMap/Secret/ServiceAccount 旧矩阵中的读取结果推断 Workload 读取权；`clusterviewer` 可读取项目 Workload，但不能写入。两组临时用户、绑定和 Workload 均已删除，namespace 无测试残留。

结合此前 viewer、operator 结果，A02～A04 当前项目的 viewer/operator/workspaceonly/clusterviewer 作用域边界已有真实证据；`admin` 独立 Workload 组合、projectonly 的 Workload API 边界和平台/联邦/DevOps/Extension 作用域仍未完成。

## 2026-10-20 Workload projectonly 作用域补测

使用仅绑定 `v4-migration-e2e` 项目 `viewer` Role、没有企业空间成员绑定的临时账号，通过真实 Playwright 访问临时 Deployment 详情和 API：项目详情页本轮实际正常渲染，GET 为 `200`，POST 为 `403`，DELETE 为 `403`。临时用户、项目 RoleBinding 和 Workload 已删除。

本轮结果与早期 ConfigMap 入口记录的 `/errors/403` 不同，说明项目入口行为不能跨资源类型或跨制品直接推断；当前 Workload 的 projectonly API 读写边界已取得真实证据，页面权限差异继续保留在矩阵中待统一解释。A02～A04 的 admin 独立组合和其他平台作用域仍未完成。

## 2026-10-20 应用模板版本上传 RBAC 补测

在当前部署制品上，真实浏览器使用临时 workspace viewer 账号访问 `stakater-configmap` 版本页面：版本列表 GET 返回 `200`，版本创建 POST 返回 `403`，页面正常渲染版本列表且未产生测试版本。临时用户和 WorkspaceRoleBinding 已删除。

该结果补齐 A12 workspace viewer 的读取/创建拒绝边界；应用模板完整的项目、平台和扩展作用域矩阵仍未完成。

## 2026-10-20 Workload projectonly 当前制品复核修正

为核对前文 Workload `projectonly` 的 `GET 200` 记录，本轮在当前 131 制品上重新创建独立临时用户，只绑定 `v4-migration-e2e` 项目 viewer RoleBinding，不绑定 `test-workspace` WorkspaceRoleBinding。真实浏览器登录成功，但直达 Deployment 详情进入 `/errors/403`；浏览器会话内通过集群代理对同一临时 Deployment 执行 GET、POST、PUT、PATCH、DELETE，结果均为 `403`。

临时用户、项目 RoleBinding 和 Deployment 已清理。该结果与前一条历史记录不一致，原因和制品/账号绑定上下文尚未证明，不能将两次结果合并或推断为稳定的 `projectonly` 读取权限。当前 Workload `projectonly` 组合应标记为“结果不一致，待独立复核”，不作为通过证据。

## 2026-10-20 Workload admin 独立正向补测

使用现有平台管理员真实浏览器会话，分别访问临时 Deployment、StatefulSet、DaemonSet 详情页。三类页面均渲染原生“编辑信息”和“更多操作”入口；浏览器会话内通过集群代理执行资源操作，结果如下：

| 资源        | GET | PUT | PATCH | POST | DELETE |
| ----------- | --: | --: | ----: | ---: | -----: |
| Deployment  | 200 | 200 |   200 |  201 |    200 |
| StatefulSet | 200 | 200 |   200 |  201 |    200 |
| DaemonSet   | 200 | 200 |   200 |  201 |    200 |

每类资源均完成更新、创建、删除和清理；测试 namespace 最终只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount。该结果补齐 A02～A04 的独立 admin 正向组合。`projectonly` 当前制品结果不一致、平台/联邦/DevOps/Extension 作用域和全部 V3 Action 等价仍未完成。

## A02～A04 Workload 作用域组合汇总

以下汇总只统计当前已取得真实浏览器/API 证据的组合；`projectonly` 采用带有效邮箱且 Active 的当前复核结果，另一账号上下文的全部 `403` 记录单独保留，不混入通过结论。

| 组合                        | 企业空间绑定 | 项目绑定 | 集群绑定       | 页面/API 结论                                                                |
| --------------------------- | ------------ | -------- | -------------- | ---------------------------------------------------------------------------- |
| viewer                      | viewer       | viewer   | 无             | 页面正常；GET `200`，POST/PUT/PATCH/DELETE `403`                             |
| operator                    | viewer       | operator | 无             | 页面正常；GET/PUT/PATCH/DELETE `200`，POST `201`                             |
| admin                       | viewer       | admin    | 无             | 页面正常；GET/PUT/PATCH/DELETE `200`，POST `201`                             |
| workspaceonly               | viewer       | 无       | 无             | 页面 `/errors/403`；全部请求 `403`                                           |
| projectonly（有效账号复核） | 无           | viewer   | 无             | 页面正常；GET `200`，POST/PUT/PATCH/DELETE `403`；另一账号上下文为全部 `403` |
| clusterviewer               | viewer       | 无       | cluster-viewer | 页面正常；GET `200`，POST/PUT/PATCH/DELETE `403`                             |

该表闭合了 A02～A04 当前制品的六种账号组合记录，但不等同于联邦、DevOps、Extension 或其他 V3 Action 的全局 RBAC 验收。

## 2026-10-20 Workload projectonly 有效账号复核

为复核前一次 `projectonly` 全部 `403` 结果，本轮重新创建带有效邮箱、状态为 Active 的临时用户，只绑定 `v4-migration-e2e` 项目 `viewer` RoleBinding，不绑定企业空间权限。真实浏览器登录成功后，分别访问 Deployment、StatefulSet、DaemonSet 原生详情路由，页面均渲染资源详情和资源状态。

同一浏览器会话通过集群代理对三类临时 Workload 执行 API 验证：

| 资源        | GET | POST | PUT | PATCH | DELETE |
| ----------- | --: | ---: | --: | ----: | -----: |
| Deployment  | 200 |  403 | 403 |   403 |    403 |
| StatefulSet | 200 |  403 | 403 |   403 |    403 |
| DaemonSet   | 200 |  403 | 403 |   403 |    403 |

临时用户、RoleBinding 和三类 Workload 均已删除，namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。该结果与此前有效账号的 `GET 200、写入 403` 记录一致，但仍与另一账号上下文中的全部 `403` 结果不一致；账号元数据和登录上下文差异尚未完全证明原因，因此 `projectonly` 仍保留为“结果不一致，待独立解释”，不能扩大为全量 RBAC 通过。

## 2026-10-20 平台只读角色三类目标资源补测

在当前 131 制品上创建临时平台只读用户、GlobalRole 和 GlobalRoleBinding。GlobalRole 规则由已安装的 `global-view-workspaces`、`global-view-clusters`、`global-view-users` 和 `global-view-roles` RoleTemplate 规则合并生成，未授予创建、更新或删除权限。真实 Playwright 登录后，ConfigMap、Secret、ServiceAccount 项目页面均能渲染；ConfigMap 列表显示当前 namespace 的系统对象，Secret 和 ServiceAccount 页面也能正常访问。

浏览器会话内对 `v4-migration-e2e` 三类资源执行列表读取和创建拒绝验证：

| 资源           | GET | POST | 页面结果                         |
| -------------- | --: | ---: | -------------------------------- |
| ConfigMap      | 200 |  403 | 项目 ConfigMap 页面正常渲染      |
| Secret         | 200 |  403 | 项目 Secret 页面正常渲染         |
| ServiceAccount | 200 |  403 | 项目 ServiceAccount 页面正常访问 |

平台只读用户还实际访问了 `/access/workspaces`、`/clusters`、`/access/accounts`、`/extensions/management`、`/settings/base-info`，路由均保持可访问。本轮临时用户、GlobalRole 和 GlobalRoleBinding 已删除并复核不存在；测试 namespace 没有留下拒绝请求对象。

该证据补齐了平台只读作用域对 ConfigMap、Secret、ServiceAccount 的读/写边界，但不代表平台角色具有全部页面或全部 V3 Action 等价权限，也不关闭联邦、DevOps、Extension 和 project-only 结果差异。

## 2026-10-20 三项目标复核后的 RBAC 结论

本次复核基于当前部署制品和已有真实浏览器/API 证据重新整理结论：

| 目标                                                       | 当前状态           | 证据范围和未闭环边界                                                                                                                                   |
| ---------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ConfigMap、Secret、ServiceAccount 的项目/集群/平台只读组合 | 已验证             | 六种项目/集群组合及平台只读三类资源读写边界均有浏览器会话状态码；有效 `projectonly` 账号的读取/拒绝边界已重新复核，历史全部 `403` 记录保留为异常上下文 |
| 全部 RBAC 组合矩阵                                         | 未完成             | 联邦、DevOps、扩展作用域缺少可执行 fixture 或后端能力；全部资源类型、全部页面和全部动态 Action 的正反权限尚未逐项闭合                                  |
| API Server 实际故障环境                                    | 已完成（限定范围） | 三次真实 K3s 停止/恢复记录覆盖目标资源列表和恢复链路；不等同于全部页面、写操作和动态 Action 故障验证                                                   |

因此，本文件中的“已验证”只适用于表格中明确列出的资源、作用域和操作；不能把当前记录升级为全平台完整 RBAC 通过。

## 2026-10-20 projectonly 有效登录上下文复核

为解释此前 `projectonly` 账号出现的全部 `403` 记录，本轮重新创建了状态为 Active、带有效邮箱、只绑定 `v4-migration-e2e` 项目 `viewer` RoleBinding 的临时用户，没有企业空间 RoleBinding。真实浏览器登录后，原生 Deployment 详情页正常渲染；同一浏览器会话对 ConfigMap、Secret、ServiceAccount 和 Deployment 执行列表与写入请求，结果如下：

| 资源           | GET | POST | PUT | PATCH | DELETE |
| -------------- | --: | ---: | --: | ----: | -----: |
| ConfigMap      | 200 |  403 | 403 |   403 |    403 |
| Secret         | 200 |  403 | 403 |   403 |    403 |
| ServiceAccount | 200 |  403 | 403 |   403 |    403 |
| Deployment     | 200 |  403 | 403 |   403 |    403 |

本轮临时用户、RoleBinding、Deployment 和请求探针均已清理。该结果与此前有效账号的读取边界一致；此前全部 `403` 的记录没有可复现的有效登录上下文，保留为历史异常记录，不再作为当前通过证据。该组合现在可纳入当前制品的项目只读正反矩阵。

## 2026-10-20 平台只读组合完整 CRUD 拒绝复核

本轮创建只绑定临时 GlobalRole 的平台只读用户，不绑定项目 RoleBinding。GlobalRole 规则由 `global-view-workspaces` 和 `global-view-clusters` 的只读规则组成。真实浏览器登录后，在 `v4-migration-e2e` 对四类资源执行列表、详情、创建、更新、Patch 和删除请求：

| 资源           | 列表/详情 | POST | PUT | PATCH | DELETE |
| -------------- | --------: | ---: | --: | ----: | -----: |
| ConfigMap      |   200/200 |  403 | 403 |   403 |    403 |
| Secret         |   200/200 |  403 | 403 |   403 |    403 |
| ServiceAccount |   200/200 |  403 | 403 |   403 |    403 |
| Deployment     |   200/200 |  403 | 403 |   403 |    403 |

页面可渲染目标 Workload 详情，所有临时资源、用户、GlobalRole 和 GlobalRoleBinding 已删除；测试 namespace 复核只剩系统 ConfigMap 和默认 ServiceAccount。该证据关闭了平台只读组合对这四类资源的完整 CRUD 拒绝缺口，但不扩大为联邦、DevOps、Edge、Extension 或其他资源类型的全量 RBAC 通过。

## 2026-10-21 当前范围 RBAC 组合总表

为避免把三个资源模块的完整组合误写成全平台完整矩阵，本节按当前可执行的业务范围汇总已取得的真实浏览器/API证据，并把环境不可执行项单独列出：

| 作用域组合                     | ConfigMap / Secret / ServiceAccount                                                 | Deployment / StatefulSet / DaemonSet                                            | 应用模板 A09/A12                                    | DevOps A06/A07                        | 联邦/Edge A05/A10                                              | 通知/扩展 A08                                             |
| ------------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| 项目 `viewer`                  | GET `200`；写入 `403`；角色 PATCH `403`                                             | GET `200`；写入 `403`                                                           | 版本读取 `200`；创建 `403`                          | 页面可达；后端能力 `404`              | 无 fixture                                                     | 未建立独立低权限入口证据                                  |
| 项目 `operator`                | GET `200`；POST `201`；PUT/PATCH/DELETE `200`                                       | GET/PUT/PATCH `200`；POST `201`；DELETE `200`                                   | 未建立完整组合                                      | 后端能力 `404`                        | 无 fixture                                                     | 未建立独立组合                                            |
| 项目 `admin`                   | GET `200`；POST `201`；PUT/PATCH/DELETE `200`                                       | GET/PUT/PATCH `200`；POST `201`；DELETE `200`                                   | 原生编辑、上传和删除已有部分成功证据                | 后端能力 `404`                        | 无 fixture                                                     | 页面可达，但通知查询 `400`                                |
| 仅 `workspaceonly`             | 项目资源读取/写入均 `403`                                                           | 详情和 CRUD 均 `403`                                                            | 版本读取 `200`、创建 `403`                          | viewer 创建请求 `403`，列表后端 `404` | 无 fixture                                                     | 未建立独立组合                                            |
| 仅 `projectonly`               | 当前有效 Active 账号 GET `200`；写入 `403`；早期无法复现的全 `403` 仅保留为历史异常 | 当前有效账号详情 GET `200`；写入 `403`；早期无法复现的全 `403` 仅保留为历史异常 | 未建立完整组合                                      | 未建立组合                            | 无 fixture                                                     | 未建立组合                                                |
| `clusterviewer`                | 集群 GET `200`；项目写入 `403`                                                      | 项目详情 GET `200`；写入 `403`                                                  | 未建立完整组合                                      | 未建立组合                            | 无 fixture                                                     | 未建立组合                                                |
| 平台只读                       | 三类资源列表/详情 GET `200`；POST/PUT/PATCH/DELETE `403`                            | 四类目标资源 GET `200`；写入 `403`                                              | 全局只读列表 GET `200`；POST/PUT/PATCH/DELETE `403` | 管理员读取仍受后端 `404` 限制         | 无 fixture                                                     | 平台页面可达；完整权限未建立                              |
| 联邦/DevOps/Extension 专用组合 | 不适用                                                                              | 不适用                                                                          | 不适用                                              | DevOps 扩展未 `Installed`             | FederatedProject/FederatedResource/EdgeWorkload fixture 不存在 | `whizard-notification` 未 `Installed`，扩展错误按要求延期 |

该表已经覆盖当前 131 能执行的项目、集群和平台主要组合，并明确记录未建立的组合和环境边界；它仍不能被解释为“全平台 RBAC 已通过”。当前有效 `projectonly` 账号的读取/拒绝结果已重复复核，早期无法复现的全 `403` 仅作为历史异常保留。完整 RBAC 的剩余条件是：补齐可用的联邦、DevOps、Edge、Extension fixture 后，对每个入口执行正向、拒绝、错误、取消和刷新路径。

2026-10-21 复核后，表中已验证项仍以真实浏览器/API 状态码为准；API Server 故障期间对 ConfigMap 的 PATCH、DELETE、POST 返回 `502` 属于基础设施故障证据，不计入任何 RBAC 组合的成功或拒绝结果。联邦、DevOps、Edge、Extension 专用组合仍未建立，不能用平台管理员或其他资源的权限结果推断通过。

## 2026-10-21 应用模板管理员上传与删除补测

在当前 131 制品上使用真实管理员浏览器，对 `test-workspace` 应用模板列表执行临时 Helm Chart 的上传、列表刷新和删除：校验请求返回 `200`，创建请求返回 `200`，列表出现唯一临时模板；删除确认要求输入系统生成的模板名称，确认请求返回 `200`，删除后列表回到空数据态，API 查询未发现临时对象。

该证据只补齐当前 `admin` 组合在应用模板 A12 的上传/删除成功边界，不能推断 `viewer`、`workspaceonly`、`projectonly`、`clusterviewer` 或平台只读对应用模板写操作的结果。低权限应用模板正反权限、冲突/失败路径以及 DevOps、联邦、Edge、通知和扩展专用组合仍未闭环。

## 2026-10-21 平台全局只读应用模板权限补测

本轮创建只绑定临时 GlobalRole 的全局只读用户。GlobalRole 合并了 `global-view-workspaces` 和 `workspace-view-app-templates` 的只读规则，没有授予应用模板创建、更新或删除权限。使用真实浏览器登录后访问 `test-workspace` 的应用模板页面：页面正常渲染当前空列表，但没有“添加”或“创建”入口；读取列表请求返回 `200`。

在同一浏览器会话中对应用模板 API 执行正反请求：

| 操作              |  结果 |
| ----------------- | ----: |
| 列表 GET          | `200` |
| 创建 POST         | `403` |
| 不存在对象 PUT    | `403` |
| 不存在对象 PATCH  | `403` |
| 不存在对象 DELETE | `403` |

该证据补齐了应用模板 A09/A12 的全局只读组合。不存在对象的 GET 为 `404`，因此没有把资源不存在和权限拒绝混为一谈。临时用户、GlobalRole、GlobalRoleBinding 和测试应用模板均已删除并复核不存在，测试 namespace 未删除且无资源残留。该结果不代表 DevOps、联邦、Edge、通知、扩展或全部动态 Action 的 RBAC 组合已完成。

## 2026-10-21 工作空间应用模板管理权限补测

在当前 131 部署制品上创建临时工作空间级用户、WorkspaceRole 和 WorkspaceRoleBinding，仅授予应用模板管理规则。真实浏览器登录该用户访问 `test-workspace` 应用模板页面，页面显示“添加/创建”入口；上传临时 Helm Chart `v4-a12-chart-r3y3x` 的校验请求返回 `200`，创建请求返回 `200`，列表刷新后出现该模板。通过页面删除确认后，`DELETE` 请求返回 `200`，列表回到空数据态。

该证据补齐 A09/A12 工作空间级管理员的上传、刷新和删除成功组合。临时用户、WorkspaceRole、WorkspaceRoleBinding 和应用模板均已删除并复核不存在；`v4-migration-e2e` namespace 未删除且无本轮资源残留。工作空间级拒绝路径、冲突/网络失败、其他动态 Action，以及 DevOps、联邦、Edge、通知和扩展专用组合仍未完成，不能据此宣称完整 RBAC 矩阵通过。

## 2026-10-21 扩展与目标业务 Fixture 就绪性复核

只读核对当前集群的 `extensions.kubesphere.io` 和 Kubernetes API 资源：`devops`、`kubefed`、`kubeedge`、`whizard-notification` 均没有 `Installed` 状态；`FederatedProject`、`FederatedResource`、`EdgeWorkload` 目标 CRD 均不存在；当前可用的扩展 APIService 列表中没有 DevOps、联邦或 Edge 目标 API。该证据确认 A05～A08、A10 的缺口是环境能力/fixture 缺失，不能通过创建普通 Kubernetes 资源或模拟状态码替代。

## 2026-10-21 扩展中心全局只读 RBAC 补测

创建临时 GlobalRole、GlobalRoleBinding 和用户，仅授予 Kubernetes/扩展 API 的 `get/list/watch`，没有写权限。真实浏览器登录后访问 `/extensions/management`：扩展列表页面正常渲染，列表接口 `GET /kapis/kubesphere.io/v1alpha1/extensions?limit=10&available=true` 返回 `200`，页面显示已安装和未安装状态，没有执行安装或卸载。

点击已安装的 `frontend-forge` 详情后，页面进入 `/errors/403`。浏览器记录扩展、版本、InstallPlan 和分类读取请求为 `200`，扩展文件请求 `/kapis/package.kubesphere.io/v1alpha1/extensionversions/frontend-forge-1.0.0/files` 返回 `403`。该结果补齐“扩展列表可读、扩展制品文件读取被拒绝”的实际边界，不代表扩展详情或运行时初始化通过。

临时用户、GlobalRole、GlobalRoleBinding 和凭据均已删除并复核不存在；本轮没有修改扩展、安装计划或业务资源。扩展运行时错误按负责人要求延期。

## 2026-10-21 扩展管理员对照补测

使用现有测试管理员真实浏览器直达 `/extensions/management/frontend-forge`。详情页面正常渲染“已安装”“已启用”、版本、扩展仓库和安装/卸载说明；扩展、版本、InstallPlan、分类和扩展制品文件读取均返回 `200`。与上一条全局只读结果对照，当前证据区分了管理员完整读取与只读用户制品文件 `403` 的边界；本轮没有执行安装、卸载或配置修改，扩展初始化运行时错误仍按负责人要求延期。

## 2026-10-21 A01～A12 RBAC 组合覆盖台账

为避免把资源级 CRUD 结果外推成“完整 RBAC 组合矩阵”，本节按迁移矩阵中的十二个业务 Action 逐项记录当前证据边界。状态含义为：**已验证**表示本条 Action 的指定组合已取得真实浏览器/API 证据；**部分验证**表示只有部分角色、操作或结果路径已验证；**环境阻塞**表示目标扩展、CRD 或 fixture 不存在，当前环境无法执行；**未验证**表示已有入口或静态证据，但尚未取得该项所需的运行时权限组合。

| Action                    | 目标入口/资源                                           | 已验证的 RBAC 组合或证据                                                                                                              | 当前状态 | 尚未关闭的组合与路径                                                                                |
| ------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- |
| A01 ConfigReference       | ConfigMap、Secret、ServiceAccount 的配置引用与关联      | 项目 `viewer/operator/admin/workspaceonly/projectonly/clusterviewer`、平台只读的读写边界；部分引用读取与缓存刷新                      | 部分验证 | 引用创建/修改/删除的全角色组合、低权限拒绝、错误/取消/刷新闭环，以及所有引用类型的 V3 对照          |
| A02 Deployment            | 列表、详情、YAML、编辑、伸缩、HPA、回退、重新创建、删除 | 项目 `viewer/operator/admin/workspaceonly/projectonly/clusterviewer`、平台只读；管理员合法/非法 YAML、冲突、HPA、回退、重新创建、删除 | 部分验证 | 每个组合的全部操作正反路径、取消/网络错误、完整字段、V3 Action 清理和独立复核                       |
| A03 StatefulSet           | 列表、详情、YAML、编辑、伸缩、HPA、回退、重新创建、删除 | 项目主要组合、平台只读；管理员合法/非法 YAML、冲突、HPA、回退、重新创建、删除                                                         | 部分验证 | 全角色完整操作矩阵、失败/取消/网络错误、字段等价和 V3/Wujie 运行时清理                              |
| A04 DaemonSet             | 列表、详情、YAML、编辑、回退、重新创建、删除            | 项目主要组合、平台只读；管理员合法/非法 YAML、冲突、回退、重新创建、删除；确认当前没有 HPA 菜单                                       | 部分验证 | 全角色完整操作矩阵、自动扩缩边界与 V3 对照、失败/取消/网络错误和运行时清理                          |
| A05 Edge 应用模板创建     | Edge 应用模板创建与部署                                 | 当前没有 Edge 应用/模板 fixture                                                                                                       | 环境阻塞 | 安装并配置目标扩展、准备真实 Edge fixture 后，执行正向、拒绝、错误、取消、刷新和返回路径            |
| A06 DevOps 编辑           | DevOps 编辑入口及后端 Action                            | 页面可达，但 DevOps 后端请求为 `404`，未取得有效业务权限结果                                                                          | 环境阻塞 | 需要可用 DevOps 扩展、集群和项目 fixture；随后覆盖 workspace/project/platform 角色及失败路径        |
| A07 DevOps 创建           | DevOps 创建入口及后端 Action                            | 当前仅观察到入口/集群选择状态，不能作为创建权限证据                                                                                   | 环境阻塞 | 需要可用 DevOps fixture；覆盖创建成功、拒绝、校验失败、取消、刷新和删除                             |
| A08 通知设置              | 用户通知/静默策略入口                                   | 路由可达；页面仍加载 `/consolev3`、`v3dist`，silences API 返回 `400`                                                                  | 未验证   | 需要 V4 替代行为或明确的兼容边界；覆盖各角色读写、错误、取消、刷新/返回和旧运行时移除               |
| A09 应用模板创建          | Workspace 应用模板选择、创建/安装                       | workspace viewer 读取/创建拒绝；workspace 管理员和当前管理员上传/创建/删除成功；平台只读读取/写入拒绝                                 | 部分验证 | projectonly、clusterviewer、workspace 拒绝全路径、冲突/网络失败、部署成功与失败、全部动态 Action    |
| A10 EdgeWorkload 批量删除 | EdgeWorkload 列表及批量删除                             | 当前没有 `EdgeWorkload` CRD 或 fixture                                                                                                | 环境阻塞 | 需要目标 CRD/扩展和真实对象；覆盖批量成功、部分失败、取消、低权限拒绝和缓存刷新                     |
| A11 应用部署              | 普通 Helm 应用部署与 Edge 分支                          | 普通 Helm 原生安装有管理员成功证据；Edge 分支未触发                                                                                   | 部分验证 | Edge 分支、各角色权限、校验/安装失败、取消、回滚/删除和 V3 Action 清理                              |
| A12 应用模板编辑/制品     | 模板详情、版本、Chart 上传、编辑、删除                  | workspace viewer 读取/创建拒绝；workspace 管理员和管理员上传、刷新、删除成功；平台只读读取/写入拒绝；重复上传语义已记录               | 部分验证 | projectonly、clusterviewer、冲突语义的 V3 对照、网络失败、取消、直达/返回和制品运行时 V3/Wujie 清理 |

### 台账结论

当前已取得的 RBAC 证据可以证明 ConfigMap、Secret、ServiceAccount、Deployment、StatefulSet、DaemonSet 以及应用模板的若干角色和操作边界；不能证明 A01～A12 的全部角色、全部操作和全部结果路径均已通过。A05～A07、A10 的主要阻塞是 131 环境缺少目标扩展/CRD/fixture，A08 还存在明确的 V3/Wujie 兼容加载和 API `400`，这些项不能用管理员或普通资源的结果代替。完整 RBAC 组合矩阵继续保持**未完成**，直到环境补齐并完成逐项正反验证。

## 2026-10-21 工作空间管理员与项目资源作用域隔离复核

使用当前 131 已部署制品创建临时工作空间管理员账号，仅绑定 `test-workspace` 的 `test-workspace-admin` `WorkspaceRoleBinding`，未绑定 `v4-migration-e2e` 项目 RoleBinding。真实浏览器登录后取得以下结果：

| 访问范围            | 浏览器页面                                                | API 读取结果                | 结论                                     |
| ------------------- | --------------------------------------------------------- | --------------------------- | ---------------------------------------- |
| 项目 ConfigMap      | 直达项目 ConfigMap 路由进入 `/errors/403`                 | ConfigMap 列表/详情均 `403` | 工作空间管理员没有项目资源读取权         |
| 项目 Secret         | 与 ConfigMap 相同的项目作用域                             | 列表/详情均 `403`           | 不能把工作空间权限外推为项目 Secret 权限 |
| 项目 ServiceAccount | 与 ConfigMap 相同的项目作用域                             | 列表/详情均 `403`           | 项目资源权限需要独立项目角色             |
| 项目 Deployment     | 与 ConfigMap 相同的项目作用域                             | 列表/详情均 `403`           | Workload 也遵守项目作用域隔离            |
| 工作空间应用模板    | `/workspaces/test-workspace/app-templates` 正常渲染空列表 | 应用模板列表 GET `200`      | 工作空间管理员权限只覆盖工作空间资源     |

本轮没有创建、编辑或删除业务对象；只创建了带唯一标签的临时测试对象用于确认环境，已全部删除。临时用户和 `WorkspaceRoleBinding` 已删除并复核不存在，`v4-migration-e2e` namespace 仍保留且无本轮对象残留。该结果补强 `workspaceonly` 的负向项目资源边界和 A09/A12 工作空间读取边界，但不关闭完整 RBAC 组合矩阵。

## 2026-10-21 集群管理员项目资源正向 CRUD 复核

使用当前 131 已部署制品创建临时账号，仅绑定 `test-workspace` 的 workspace viewer 和集群级 `cluster-admin`，未绑定项目 RoleBinding。真实浏览器登录后打开项目 ConfigMap 页面，页面正常渲染并显示当前 namespace 对象。随后在同一浏览器会话中对 ConfigMap、Secret、ServiceAccount、Deployment 分别执行列表、详情、创建、PATCH、PUT 和删除：

| 资源           | 列表 | 详情 | POST | PATCH | PUT | DELETE |
| -------------- | ---: | ---: | ---: | ----: | --: | -----: |
| ConfigMap      |  200 |  200 |  201 |   200 | 200 |    200 |
| Secret         |  200 |  200 |  201 |   200 | 200 |    200 |
| ServiceAccount |  200 |  200 |  201 |   200 | 200 |    200 |
| Deployment     |  200 |  200 |  201 |   200 | 200 |    200 |

所有 POST 对象使用唯一名称，PUT/PATCH 仅修改本轮临时对象；删除响应为 `200`，之后通过 Kubernetes API 清理原始临时对象。临时用户、workspace/cluster 绑定、四类资源和凭据均已删除并复核不存在，测试 namespace 保留且无本轮对象残留。

该结果补齐当前制品“workspace viewer + cluster admin”对四类项目资源的正向 CRUD 证据，与平台只读、workspaceonly、projectonly 和项目角色的拒绝/正向边界形成更完整的当前资源矩阵；它仍不能外推到 DevOps、Federation、Edge、Notification、Extension 或全部动态 Action。

## 2026-10-21 工作空间 viewer 应用模板完整读取/拒绝复核

使用当前 131 已部署制品创建临时工作空间 `viewer` 账号，仅绑定 `test-workspace-viewer`，不绑定项目角色。真实浏览器访问 `/workspaces/test-workspace/app-templates`，页面正常渲染空列表，没有创建入口；同一会话对工作空间应用模板 API 执行列表、创建、更新、Patch 和删除：

| 操作        | 结果 |
| ----------- | ---: |
| 列表 GET    |  200 |
| 创建 POST   |  403 |
| 更新 PUT    |  403 |
| Patch       |  403 |
| 删除 DELETE |  403 |

不存在对象的写请求使用唯一名称，未产生业务对象。临时用户、WorkspaceRoleBinding 和凭据已删除并复核不存在，测试 namespace 无本轮残留。该结果补齐 A09/A12 工作空间 viewer 的读取/写入拒绝组合，但不覆盖项目、集群、平台、DevOps、联邦、Edge、通知、扩展和完整动态 Action 矩阵。

## 2026-10-21 应用模板 projectonly 与 clusterviewer 组合复核

为补齐 A09/A12 尚未独立记录的作用域，分别创建两个临时账号：`projectonly` 仅绑定 `v4-migration-e2e` 项目 `viewer` RoleBinding，不绑定工作空间角色；`clusterviewer` 绑定 `test-workspace` workspace viewer 和集群 `cluster-viewer`，不绑定项目 RoleBinding。

真实浏览器分别访问 `/workspaces/test-workspace/app-templates`，两组页面均能渲染当前空列表；同一会话对应用模板 API 的结果一致：

| 组合            | 列表 GET | 创建 POST | 更新 PUT | Patch | 删除 DELETE |
| --------------- | -------: | --------: | -------: | ----: | ----------: |
| `projectonly`   |      200 |       403 |      403 |   403 |         403 |
| `clusterviewer` |      200 |       403 |      403 |   403 |         403 |

该结果说明应用模板列表读取由工作空间应用 API 单独授权，不能从项目页面权限直接推断；两组组合均没有写权限。临时用户、项目/工作空间/集群绑定和凭据已删除并复核不存在，测试 namespace 无本轮残留。A09/A12 的这两组读取/写入边界已补入矩阵，但应用模板完整成功、失败、冲突、取消、刷新和 V3 等价仍未完成。

## 2026-10-21 应用模板 workspace regular 与 clusteronly 组合复核

继续补测两个无项目写权限的作用域：`workspace regular` 仅绑定 `test-workspace-regular`，`clusteronly` 仅绑定集群 `cluster-viewer`。真实浏览器分别访问工作空间应用模板页面，页面均能渲染当前空列表；应用模板 API 结果均为 GET `200`、POST/PUT/PATCH/DELETE `403`。

临时用户、WorkspaceRoleBinding、ClusterRoleBinding 和凭据已删除并复核不存在，测试 namespace 无残留。至此，A09/A12 当前环境已记录 `workspace viewer`、`workspace regular`、`projectonly`、`clusterviewer`、`clusteronly`、平台只读、workspace 管理员和管理员的主要读取/写入边界；成功、失败、冲突、取消、刷新和 V3 替代行为仍未全部验证。

## 2026-10-21 插件范围与核心 RBAC 边界调整

负责人确认 DevOps、KubeFed、KubeEdge、Notification 属于后续插件对接范围。本轮“核心 RBAC 组合矩阵”范围调整为 ConfigMap、Secret、ServiceAccount、Deployment、StatefulSet、DaemonSet、应用模板及其现有平台/工作空间/项目/集群作用域。上述插件没有作为核心资源验收的统一阻塞条件，也不在本轮安装或配置。

插件相关的 A05～A08、A10 仍保留在历史台账中，状态统一解释为“后置、未验证”，不能解释为本轮已通过。核心范围内 A01～A04、A09、A11、A12 仍有部分操作、失败/取消路径和等价性证据缺口，核心 RBAC 矩阵尚未全部完成。

## 2026-10-21 A01 ConfigReference 低权限拒绝复核

使用临时 `workspace viewer + v4-migration-e2e 项目 viewer` 账号，在当前 131 制品真实登录并直达 Deployment 的 ConfigReference 页面。页面能够读取当前 Deployment、当前 namespace 的 ConfigMap/Secret 名称和键数量；Secret 值没有出现在页面中。点击“应用”尝试提交引用变更时，原生 Deployment JSON Patch 返回 `403`，页面没有产生成功提示，Kubernetes API 回读确认 `envFrom` 未被修改。

本轮临时 Deployment、ConfigMap、Secret、用户、WorkspaceRoleBinding、项目 RoleBinding 和临时凭据均已清理并复核不存在。该证据关闭 A01 的一条低权限拒绝子路径，并补充了引用页面的真实渲染和 Secret 脱敏边界；A01 仍缺少全角色引用写入矩阵、错误/取消/网络失败、刷新返回和完整 V3 对照，因此继续保持“部分验证”。

同一制品继续使用 `workspace viewer + cluster viewer`、不绑定项目 RoleBinding 的临时账号复核 A01。ConfigReference 页面正常渲染当前 Deployment、ConfigMap/Secret 引用名称和键数量，Secret 值未显示；点击“应用”后的 Deployment JSON Patch 返回 `403`，API 回读确认 `envFrom` 保持不变。临时 Workload、ConfigMap、Secret、IAM 绑定和凭据均已清理并复核不存在。该结果补齐 A01 的集群只读拒绝子路径，仍不等同于完整角色矩阵通过。
