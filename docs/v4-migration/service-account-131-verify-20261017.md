# ServiceAccount 模块级 VERIFY 记录（2026-10-17）

## 范围和制品

- 分支：`feature/v4-configmaps-secrets`
- Git HEAD：`5e12c0ec3f4cfe295cb57859a19ae8b913661f5f`
- 测试环境：`192.168.2.131:30880`，Kubernetes context `default`
- 测试 namespace：`v4-migration-e2e`
- 镜像 tag：`feature-v4-configmaps-secrets-20261017-164719-5e12c0ec3f4c`
- 镜像 digest：`sha256:a2600930a7f5e199e4a2f8db49669b4dd16bf26c4330fdf7cb82ab5be32b30ac`
- Pod imageID：`ghcr.io/mysstack/ks-console@sha256:a2600930a7f5e199e4a2f8db49669b4dd16bf26c4330fdf7cb82ab5be32b30ac`
- Playwright artifact 目录：`output/playwright/v4-configmaps-secrets-20261017/`

## 验证结果

| 检查项         | 结果             | 证据                                                                                                                                           |
| -------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 项目级列表     | 通过             | `/test-workspace/clusters/host/projects/v4-migration-e2e/serviceaccounts`，按项目筛选显示 `default` 和本轮对象                                 |
| 集群级列表     | 通过             | `/clusters/host/serviceaccounts` 可直接访问，显示跨项目 ServiceAccount 列表；刷新后页面仍可用                                                  |
| 创建           | 通过             | 原生创建弹窗创建 `v4-sa-20261017-0902`，项目选择为 `v4-migration-e2e`                                                                          |
| 详情和直达 URL | 通过             | `/test-workspace/clusters/host/projects/v4-migration-e2e/serviceaccounts/v4-sa-20261017-0902/detail` 显示 namespace、cluster、创建者和创建时间 |
| 角色管理入口   | 部分通过         | 原生“修改角色”可打开，读取到 `viewer`、`operator` 等项目角色选项；未选择或提交角色，避免擅自增加权限                                           |
| Secret 关联    | 通过             | API 复核本轮 ServiceAccount 的 `secrets_field_count=0`，关联 Secret 数量为 `0`；符合当前 Kubernetes 不自动生成长期 Token Secret 的实际行为     |
| 编辑字段       | 未完成           | 本轮未提交 ServiceAccount YAML 或角色变更                                                                                                      |
| 删除           | 通过             | 原生删除 `v4-sa-20261017-0902`，API 复核为 NotFound                                                                                            |
| namespace 隔离 | 部分通过         | 项目筛选和项目详情路由通过；缺少低权限账号和跨 namespace 正反权限验证                                                                          |
| RBAC 正反路径  | 阻塞             | 当前只有 admin 测试凭据，未模拟低权限拒绝路径，也未创建额外权限                                                                                |
| V3/Wujie 弹窗  | 通过（本轮入口） | 项目和集群列表、创建、详情、角色入口均为原生页面；未见 V3/Wujie 弹窗                                                                           |

本轮只清理 `v4-sa-20261017-0902`，没有删除测试 namespace 或既有 ServiceAccount。API 复核还确认清理后关联 Secret 数量仍为 `0`。

## 当前结论

ServiceAccount：**部分通过，未验收**。列表、创建、详情、路由、删除和当前 Kubernetes Token Secret 行为已取得部署后证据；角色提交、可编辑字段、低权限 RBAC 和完整 namespace 隔离仍未闭环。

## 当前制品登录与页面渲染复验

- 代码提交：`259b556eccd19fbbbade8392db4954f195672114`
- 镜像 tag：`feature-v4-configmaps-secrets-20261017-191324-259b556eccd1`
- 镜像 digest：`sha256:3b6748229935b3e6cf4d29a05793f59ef3b8e5136e922d6850eba28c6d9d5f89`
- GitHub Actions：Run `39027793096`，Unit tests 和 Build and publish 均通过
- Deployment：`kubesphere-system/ks-console` generation/observedGeneration `507/507`，副本、Ready、Updated、Available 均为 `1`
- Pod：`ks-console-69fc77bb7b-gbb2j` Running/Ready，imageID 与镜像 digest 一致
- 浏览器登录：新建 Playwright 会话从 `/login` 登录成功进入 `/dashboard`
- 浏览器页面：已部署制品上实际打开 `/test-workspace/clusters/host/projects/v4-migration-e2e/serviceaccounts`，标题“服务帐户”、项目选择器、搜索/刷新/定制内容/创建工具栏、表头、`default` 行和分页均正常渲染；本地截图 `.playwright-cli/page-2026-10-17T11-20-57-218Z.png` 未提交 Git
- 控制台错误：页面仍记录已知全局/扩展错误，不能据此宣称浏览器无错误；但本轮 ServiceAccount 列表入口可访问并完成渲染

本补充只关闭了“登录和页面显示”证据，不改变 ServiceAccount 的“部分通过，未验收”结论；角色提交、可编辑字段、低权限 RBAC 和完整 namespace 隔离仍待完成。

## 2026-10-17 项目 namespace 作用域修复

项目级 ServiceAccount 路由同样带有 `:namespace`。旧实现虽然通过自定义 URL 请求了当前 namespace，但通用列表页仍显示“全部项目”，会造成页面范围与实际请求范围不一致。提交 `00310f5e5a3105f177e9e8d413db359f26bbd1d1` 已将项目路由下的跨项目选择器隐藏，并使创建弹窗锁定当前 namespace；集群级 ServiceAccount 页面继续保留全局范围。

该提交对应候选镜像 `feature-v4-configmaps-secrets-20261017-200414-00310f5e5a31`，digest 为 `sha256:f9468e155d98b7872f35d5d2099f1d6e38f2093006ee77eddb85f20201f45a54`，GitHub Actions Run 为 `39031017563`。候选镜像在 131 上的部署尝试因新 Pod `ks-console-699dd9c46f-ldvtc` 长时间停留在 `ContainerCreating` 而超时，随后已回滚到上一版；没有形成候选 Pod imageID，也没有在候选制品上完成浏览器验收。

因此本记录仍只能证明旧制品的登录和页面渲染，不能证明本次 namespace 选择器修复已经在 131 页面生效。ServiceAccount 继续保持“部分通过，未验收”。
