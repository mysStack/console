# ServiceAccount 原生迁移 131 部署记录

> 阶段门禁说明：本文记录的是 P2-REA 门禁前已经完成的先行实现和部署验证，用于保留事实证据；旧 V3 源码、完整 REA/API/Action、RBAC 和作用域矩阵完成前，不视为 P2 正式开发或模块验收完成。当前门禁以 [REA 阶段分析总结](./rea-analysis-summary.md) 和 [迁移矩阵](./matrix.md) 为准。

> 历史制品说明：本文包含初始只读验收和后续真实操作复验。顶部提交、Run `38855707450` 和 digest `sha256:000928bb3f0ee7a608eea0fe06fb7997b1ef5a090cc07e5704cf3a0f0dcb099e` 是初始部署记录；后续真实操作使用文中“本轮真实操作复验”和“第二轮真实编辑、角色和 RBAC 复验”所列制品。不存在一个覆盖全文的单一当前制品，门禁以 [REA 阶段分析总结](./rea-analysis-summary.md) 和 [迁移矩阵](./matrix.md) 为准。

> 日期：2026-10-16（上海时间）<br>
> 环境：`192.168.2.131:30880`<br>
> 分支：`feature/v4-migration`<br>
> 提交：`1634dfb6523de3c89049382cd46952eba46f8a32`

## 本地实现和构建

- 项目 ServiceAccount 列表改为复用原生 `ListPage` 和 `serviceAccountStore`。
- 集群 ServiceAccount 列表路由切换为原生实现。
- 项目 ServiceAccount 详情从 Wujie V3 改为原生 `DetailPage`，复用 Secret 数据详情和角色修改弹窗。
- 新增原生 ServiceAccount 创建弹窗，包含名称和项目选择，并接入创建 mutation。
- 删除不再使用的 `ServiceAccounts/Embed.tsx`。
- 修正项目 ServiceAccount 详情路由大小写，并让项目列表按当前项目 namespace 查询，避免跨项目链接到不存在的 namespace。
- 相关测试、ESLint、Prettier 和 `git diff --check` 已通过；GitHub Actions Unit tests 和构建 Job 均通过。

## 构建制品

- Run：`38855707450`
- Run 地址：<https://github.com/mysStack/console/actions/runs/38855707450>
- 镜像 tag：`feature-v4-migration-20261016-132633-1634dfb6523d`
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-132633-1634dfb6523d`
- 多架构索引 digest：`sha256:000928bb3f0ee7a608eea0fe06fb7997b1ef5a090cc07e5704cf3a0f0dcb099e`

## 131 部署结果

执行了 `kubectl set image` 和 `kubectl rollout status`，新制品已成功部署：

- 当前 Pod：`ks-console-59dccf684d-7lvp7`
- 当前镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-132633-1634dfb6523d`
- 当前 Pod imageID：`ghcr.io/mysstack/ks-console@sha256:000928bb3f0ee7a608eea0fe06fb7997b1ef5a090cc07e5704cf3a0f0dcb099e`
- 当前状态：rollout 成功，Pod `Running/Ready`，重启次数 `0`

前一轮 Run `38851180485` 的事件后来确认镜像拉取耗时约 10 分 44 秒和 20 分 52 秒；本轮节点已有缓存层，rollout 很快完成。该问题属于节点到镜像仓库的拉取耗时，不是制品构建失败。

## Playwright 验收

在上述 Pod 对应制品上使用专用测试账号完成只读浏览器验收：

- 项目列表：`/test-workspace/clusters/host/projects/test-wes/serviceaccounts` 正常打开，列表只显示 `test-wes` 项目的 ServiceAccount，共 1 条。
- 项目详情：点击 `default` 后进入 `/test-workspace/clusters/host/projects/test-wes/serviceaccounts/default/detail`，显示原生详情页、属性和“数据”Tab，未进入 404 或 V3 页面。
- 创建弹窗：点击“创建”显示原生弹窗，包含“名称”和“项目”字段；点击“取消”可关闭，未提交资源。
- 集群列表和详情：`/clusters/host/serviceaccounts` 正常打开，直达 `/clusters/host/projects/test-wes/serviceaccounts/default` 可进入原生详情页。

浏览器控制台仍有既有请求错误记录，未影响上述页面完成渲染；真实创建、编辑、删除、角色修改和 RBAC 权限回归未执行。

## 初始部署时尚未完成（后续真实操作复验见下文）

ServiceAccount 的列表、详情、创建弹窗、路由和项目作用域已完成 131 部署及浏览器验收；真实创建、编辑、删除、角色修改和一组 RBAC 权限回归已有先行证据，但完整 REA/API/Action、权限和作用域矩阵仍待补齐，因此模块状态按“分析中”处理。

## 本轮真实操作复验（2026-10-16）

在当前已部署制品 `feature-v4-configmaps-secrets-20261016-170820-277e50781a04` 上新增测试 ServiceAccount，Playwright 发起的创建请求返回 `201 Created`，随后通过 Kubernetes API 确认资源位于 `test-wes` namespace；再通过原生操作菜单打开“修改角色”，但当前测试项目没有可用项目角色（接口返回 `No Data`），因此没有伪造角色修改成功证据。最后通过原生删除确认弹窗完成删除，API 返回 `200 OK`，并通过 Kubernetes API 确认资源已不存在。

编辑信息、角色修改成功路径、权限差异和 Secret 数据关联仍未完成；这些记录属于先行验证，模块当前按“分析中”处理。

## 第二轮真实编辑、角色和 RBAC 复验（2026-10-16）

为补齐上一轮缺口，在同一 131 制品上使用测试项目 `test-wes` 执行受控复验：

- 通过 Kubernetes API 创建临时 ServiceAccount `codex-v4-e2e-sa-edit-20261016`，再通过原生“编辑信息”修改描述；列表回读显示新描述，确认编辑请求生效。
- 通过 Kubernetes API 创建临时项目角色 `codex-v4-e2e-role-20261016`，使“修改角色”弹窗具备可选项；通过原生弹窗为 ServiceAccount 设置该角色，列表回读显示角色名称，确认角色修改请求成功。
- 通过 `kubectl auth can-i` 以该 ServiceAccount 身份执行一组 RBAC 正负校验：允许读取项目 Pod，拒绝删除项目 Pod；角色绑定由平台自动生成并指向该 ServiceAccount。
- 通过原生删除确认弹窗删除临时 ServiceAccount，API 返回成功；随后清理临时项目角色，并确认关联 RoleBinding 已不存在。

本轮仅验证一组最小 RBAC 正负权限，完整权限矩阵、不同用户权限差异和 Secret 数据关联仍待补齐；这些记录属于先行验证，模块当前按“分析中”处理。
