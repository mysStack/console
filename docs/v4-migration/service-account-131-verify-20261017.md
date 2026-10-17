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
