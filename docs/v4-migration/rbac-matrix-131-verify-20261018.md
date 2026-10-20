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

以下汇总只统计当前已取得真实浏览器/API 证据的组合；`projectonly` 采用当前制品复核结果，历史 `GET 200` 记录单独保留，不混入通过结论。

| 组合                    | 企业空间绑定 | 项目绑定 | 集群绑定       | 页面/API 结论                                                         |
| ----------------------- | ------------ | -------- | -------------- | --------------------------------------------------------------------- |
| viewer                  | viewer       | viewer   | 无             | 页面正常；GET `200`，POST/PUT/PATCH/DELETE `403`                      |
| operator                | viewer       | operator | 无             | 页面正常；GET/PUT/PATCH/DELETE `200`，POST `201`                      |
| admin                   | viewer       | admin    | 无             | 页面正常；GET/PUT/PATCH/DELETE `200`，POST `201`                      |
| workspaceonly           | viewer       | 无       | 无             | 页面 `/errors/403`；全部请求 `403`                                    |
| projectonly（当前复核） | 无           | viewer   | 无             | 页面 `/errors/403`；GET/POST/PUT/PATCH/DELETE `403`，与历史记录不一致 |
| clusterviewer           | viewer       | 无       | cluster-viewer | 页面正常；GET `200`，POST/PUT/PATCH/DELETE `403`                      |

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
