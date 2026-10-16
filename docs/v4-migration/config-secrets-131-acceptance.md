# ConfigMap / Secret 原生列表 131 环境验收记录

> 阶段门禁说明：本文记录的是 P2-REA 门禁前已经完成的先行实现和部署验证，用于保留事实证据；旧 V3 源码、完整 REA/API/Action、RBAC 和作用域矩阵完成前，不视为 P2 正式开发或模块验收完成。

> 验收日期：2026-10-16（上海时间）<br>
> 环境：`192.168.2.131:30880`<br>
> 分支：`feature/v4-migration`<br>
> 首轮列表提交：`ac99e46ae8c9acf5aa69324e1b3f39f46022b647`<br>
> 当前创建弹窗提交：`28a1635b3fb1bf4f927ae0520fb53c3141e09d20`

## 构建制品

通过 GitHub Actions `Build Personal Console Image` 构建并推送镜像：

- Run：`38842700930`
- Run 地址：<https://github.com/mysStack/console/actions/runs/38842700930>
- 单元测试 Job：通过
- 构建 Job：通过
- 镜像 tag：`feature-v4-migration-20261016-105445-ac99e46ae8c9`
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-105445-ac99e46ae8c9`
- 多架构索引 digest：`sha256:33c638626155f093ac7d3ca98d461d39754b04a634601f8f88f221a356ab108e`

## 部署与 Pod 回读

执行 `kubectl set image`、`rollout status` 和 Pod 镜像回读后，rollout 成功，Pod 为 `Running` 且 `1/1`，重启次数为 `0`。

| 项目        | 实际值                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Pod         | `ks-console-6b445b4f86-lzbsl`                                                                         |
| Node        | `dev01` (`192.168.2.131`)                                                                             |
| Pod IP      | `10.42.0.131`                                                                                         |
| Pod imageID | `ghcr.io/mysstack/ks-console@sha256:33c638626155f093ac7d3ca98d461d39754b04a634601f8f88f221a356ab108e` |

## Playwright 页面验收

使用 Playwright CLI 登录专用测试账号后，访问并检查：

1. 项目 ConfigMap 列表：原生 `ListPage` 表格、项目筛选、名称搜索、创建按钮和真实资源列表正常显示。
2. 项目 Secret 列表：原生 `ListPage` 表格、类型、字段数量、项目筛选和真实资源列表正常显示；列表没有展示 Secret value。
3. ConfigMap 详情：数据、修改记录、元数据、事件四个原生 Tab 可见，真实数据正常显示。
4. Secret 详情：数据、修改记录、元数据、事件四个原生 Tab 可见，详情页面可访问。
5. 第二轮部署后，ConfigMap 列表的“创建”按钮可打开原生创建弹窗，弹窗包含名称、项目和数据字段；点击“取消”可关闭。
6. 第二轮部署后，Secret 列表的“创建”按钮可打开原生创建弹窗，弹窗包含名称、项目、类型和数据字段；点击“取消”可关闭。

截图保存在未提交的本地验收目录：

- `output/playwright/config-secrets-native-131-secrets.png`
- `output/playwright/config-secrets-native-131-configmap-detail.png`
- `output/playwright/config-secrets-native-131-secret-detail.png`

## 第二轮构建与部署记录

为验证创建弹窗，使用 `28a1635b3` 构建并部署了第二轮制品：

- Run：`38846155363`
- Run 地址：<https://github.com/mysStack/console/actions/runs/38846155363>
- 单元测试 Job：通过
- 构建 Job：通过
- 镜像 tag：`feature-v4-migration-20261016-113500-28a1635b3fb1`
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-113500-28a1635b3fb1`
- 多架构索引 digest：`sha256:e7a9e8ab4b341ba1eba04c86d4436ddc4a27776226dee3618a71d896f3230c21`
- rollout：成功
- Pod：`ks-console-bd75c476b-6h8v9`
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:e7a9e8ab4b341ba1eba04c86d4436ddc4a27776226dee3618a71d896f3230c21`

## 前两轮未通过或待补项（后续复验见下文）

- 已补齐 ConfigMap/Secret 原生创建弹窗，并在第二轮部署制品上验证打开和取消；尚未执行真实提交。
- 尚未执行真实创建、编辑、删除、批量删除及权限差异流程，因此不能把本模块标记为“已验收”。
- 浏览器控制台有扩展模块加载错误（扩展调用 `getExtensionConsoleV3Embed` 等）；这些错误来自已安装扩展，不影响本次列表和详情页面渲染，但需要单独处理。
- 因此迁移矩阵中的 ConfigMap/Secret 状态按“分析中”处理，不能替代 P2-REA 门禁。

## 第三轮原生创建复验（2026-10-16）

针对前两轮只验证弹窗、未验证数据提交的问题，已在短期分支 `feature/v4-configmaps-secrets` 修正创建表单在数据编辑器返回时丢失 `metadata` 和 `data` 的问题，并重新构建部署：

- GitHub Actions Run：`38871006795`
- 提交：`bd21a5565293073c404c5160858903bf1e22991d`
- 镜像 tag：`feature-v4-configmaps-secrets-20261016-160309-bd21a5565293`
- 镜像 digest：`sha256:6426a3c6e51ad2a2530ad43a42b057f322069f33325d814bc978f7e3ce5d41e0`
- Pod：`ks-console-8c484d5dc-85kck`
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:6426a3c6e51ad2a2530ad43a42b057f322069f33325d814bc978f7e3ce5d41e0`
- Playwright 创建请求返回 `201 Created`；随后通过 Kubernetes API 回读测试 ConfigMap，确认 namespace 为 `test-biz-config` 且 `data.test-key` 为 `test-value`。

本轮创建后已删除测试资源。编辑、批量删除、权限差异和完整 Secret CRUD 仍未完成；这些记录属于先行验证，模块当前按“分析中”处理。

## 第四轮真实创建复验（2026-10-16）

在修正数据编辑器返回和表单状态同步后，使用最新制品再次验证 ConfigMap 与 Secret 的真实创建：

- GitHub Actions Run：`38878257473`
- 提交：`277e50781a041274ce05473ed59b5ee117ccba75`
- 镜像 tag：`feature-v4-configmaps-secrets-20261016-170820-277e50781a04`
- 镜像 digest：`sha256:04650b2ddbb79dcb19443fafa639cabbb62cb08d8c0087b7a8f850402bd3e018`
- Pod：`ks-console-789d5765fd-dsp5v`
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:04650b2ddbb79dcb19443fafa639cabbb62cb08d8c0087b7a8f850402bd3e018`
- ConfigMap 创建请求返回 `201 Created`，Kubernetes API 回读确认资源位于 `test-biz-config`，数据键存在；随后通过“编辑设置”提交修改并回读确认新值，最后通过确认删除完成清理。
- Secret 创建请求返回 `201 Created`，Kubernetes API 回读确认资源位于 `test-biz-config`、类型为 `Opaque`，数据键存在；随后通过“编辑设置”提交修改并以编码值比对确认，最后通过确认删除完成清理。验收记录不写入 Secret 明文或编码值。

本轮测试资源已删除。编辑成功提交、批量删除、权限差异和完整作用域回归仍未完成；这些记录属于先行验证，模块当前按“分析中”处理。

## 第五轮批量删除与最小 RBAC 复验（2026-10-16）

在同一 131 制品上创建两组临时 ConfigMap 和 Secret，并通过原生列表批量操作完成清理：

- ConfigMap 列表同时选中两个测试资源，确认批量删除弹窗后提交；Kubernetes API 回读均为 `NotFound`。
- Secret 列表同时选中两个测试资源，确认批量删除弹窗后提交；Kubernetes API 回读均为 `NotFound`，验收记录不写入 Secret 明文或编码值。
- 在 `test-biz-config` 创建临时 ServiceAccount 和项目角色，角色仅授予 ConfigMap/Secret 的 `get/list`；`kubectl auth can-i` 验证同 namespace 可读 ConfigMap 和 Secret、不可删除 Secret，跨到 `test-wes` namespace 不可读 ConfigMap。临时 ServiceAccount、项目角色和 RoleBinding 已清理。

本轮完成批量删除和一组最小 RBAC/作用域正负校验；完整权限矩阵、不同用户权限差异和跨项目全量隔离回归仍待补；这些记录属于先行验证，模块当前按“分析中”处理。
