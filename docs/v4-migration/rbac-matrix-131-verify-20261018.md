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
