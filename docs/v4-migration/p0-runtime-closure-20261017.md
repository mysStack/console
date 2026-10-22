# P0-U002/U003 运行时针对性收尾证据

> 证据日期：2026-10-17（上海时间）
> 证据 ID：`ev_local_p0_runtime_closure_20261017_131_02`
> 验证环境：`http://192.168.2.131:30880`
> 验证方式：已部署制品上的 Playwright 只读浏览器操作、Network 观察，以及只读 Kubernetes 查询
> 当前结论：补充了四类入口和一条非破坏性动态 Action 证据；P0-U002/P0-U003 仍为“分析中，待负责人复核”。

## 1. 制品和环境身份

| 项目               | 实际值                                                                                                |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| Kubernetes context | `default`                                                                                             |
| Pod                | `kubesphere-system/ks-console-789d5765fd-dsp5v`                                                       |
| Pod image          | `ghcr.io/mysstack/ks-console:feature-v4-configmaps-secrets-20261016-170820-277e50781a04`              |
| Pod imageID        | `ghcr.io/mysstack/ks-console@sha256:04650b2ddbb79dcb19443fafa639cabbb62cb08d8c0087b7a8f850402bd3e018` |
| Pod 状态           | `Running`，容器就绪 `true`                                                                            |
| HTTP 起始响应      | `302 Found`，重定向到 `/login`                                                                        |

只读命令记录：

```text
kubectl config current-context
kubectl -n kubesphere-system get pods -o custom-columns='NAME:.metadata.name,READY:.status.containerStatuses[*].ready,IMAGE:.spec.containers[0].image,IMAGE_ID:.status.containerStatuses[0].imageID,PHASE:.status.phase'
curl -sS -I --max-time 10 http://192.168.2.131:30880
```

浏览器登录使用 `/home/bruce/.bashrc` 中的专用测试账号环境变量；账号值、密码值和会话凭据没有写入本文件。

## 2. 入口和 Network 结果

| 范围                  | 入口和操作                                         | 结果                                                                                                                            | Network / 限制                                                                                                                                                                                            |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cluster               | `/clusters/host/overview`                          | 页面正常渲染集群导航、概览统计、版本和可见性信息                                                                                | `GET /kapis/resources.kubesphere.io/v1alpha3/clusters/host`、`GET /clusters/host/kapis/iam.kubesphere.io/v1beta1/users/admin/roletemplates?scope=cluster&cluster=host`、metrics 和 version 请求均为 `200` |
| workspace             | `/workspaces/test-workspace/devops`                | 页面正常渲染 DevOps 项目入口、集群选择器、列表和创建按钮；当前未选择集群，列表显示无数据                                        | workspace cluster、workspace template、roletemplates 和 extension API 请求为 `200`；页面加载时存在已记录的扩展初始化错误                                                                                  |
| workspace 动态 Action | 点击“创建”打开“创建 DevOps 项目”弹窗，再点击“取消” | 弹窗、字段、集群设置和取消操作可用；没有提交表单                                                                                | 除登录请求外，此过程未观察到资源创建的 `POST/PUT/PATCH/DELETE` 请求；未验证真实创建、权限拒绝和失败恢复                                                                                                   |
| platform              | `/settings` 自动进入 `/settings/base-info`         | 平台设置导航和平台信息页面正常渲染                                                                                              | 页面加载完成；本轮未执行编辑或保存                                                                                                                                                                        |
| extension             | `/extensions/management`                           | 扩展中心正常渲染，页面显示总数 `48`，已安装扩展可以进入详情                                                                     | `GET /kapis/kubesphere.io/v1alpha1/extensions?limit=10&available=true` 为 `200`                                                                                                                           |
| extension detail      | `/extensions/management/frontend-forge`            | 已安装、启用状态、版本、供应商和扩展说明正常渲染                                                                                | extension、extensionversion、installplan 和 files API 请求均为 `200`；本轮未执行安装、卸载、升级、启用或禁用                                                                                              |
| federated             | `/test-workspace/federatedprojects` 及只读集群查询 | 没有发现可用于继续进入 `/:workspace/federatedprojects/:namespace` 的联邦项目命名空间；直达不带 namespace 的路径显示“页面未找到” | `kubectl get namespaces --show-labels` 未发现 federated 标签；`kubectl get federatednamespaces --all-namespaces` 返回资源类型不存在。没有伪造 namespace，也没有进行写操作                                 |

## 3. 错误态和风险结果

本轮每次主要页面加载均产生浏览器 Console 错误。已确认的重复错误包括：

- `ingress-utils`：读取 `getStoreWithQueryHooks` 时对象未定义；
- `ks-autoscaling`、`frontend-forge`、`kubeeye`、`openkruise`、`whizard-telemetry`：`getExtensionConsoleV3Embed is not a function`；
- `metrics-server`、`vertical-pod-autoscaler`：读取未定义的 `ConfigConstants` 属性。

这些错误说明“扩展入口能加载”不能等同于“扩展运行契约已通过”。它们与既有 `kubeeye` `InstallFailed` 记录共同保留为 P0-U002 的错误态证据，当前没有自动豁免或归因结论。

## 4. 验证分类

### 已验证

- 当前 131 Pod 的 tag、imageID、运行状态和就绪状态；
- cluster 概览入口、workspace DevOps 入口、platform settings 入口和 extension management/detail 入口；
- workspace DevOps 创建弹窗的打开与取消路径；
- 上述入口的代表性 `GET` Network 响应；
- 浏览器会话中的扩展初始化错误可稳定重现。

### 部分验证

- workspace DevOps 的页面、权限接口和创建入口已验证，但无可用集群数据，未验证真实列表数据、保存 API、错误恢复和低权限行为；
- extension 管理和一个已安装扩展详情已验证，尚未逐扩展验证菜单、Action、Network 和 V4 替代行为；
- cluster 入口和静态导航已验证，未逐项验证所有集群资源 Action；
- project 资源代表性运行时证据沿用 [`p0-runtime-evidence.md`](./p0-runtime-evidence.md)，本轮没有重复执行破坏性或写入操作。

### 未验证或阻塞

- 没有联邦项目 fixture，无法验证有效 federated project 详情、菜单、Network、RBAC 和错误态；
- 没有第二个低权限测试账号，无法完成 U003 要求的正负权限对照；
- 11 个业务 `useV3action` 调用和 3 个桥接文件仍未逐项完成运行时触发、参数、事件到达、取消/失败恢复和 V4 替代行为对照；
- 扩展初始化错误的根因、影响范围和修复归属尚未完成独立复核；
- 本轮没有执行任何创建、编辑、删除、伸缩、安装、卸载、升级、启用、禁用或部署操作。

## 5. 对门禁的影响

本证据把 cluster、workspace、platform 和 extension 的入口核对从“未验证”推进为“代表性部分验证”，并新增了 workspace DevOps 动态 Action 的非破坏性证据；联邦入口、低权限 RBAC、全量 Action 和扩展错误闭环仍未关闭。因此：

- P0-U002：**分析中，待负责人复核**；
- P0-U003：**分析中，待负责人复核**；
- P0-U001/P0-U004：保持原有制品 provenance 风险，不因本轮运行时证据自动关闭；
- P1/P2：不进入正式开发；
- Draft PR #1：保持 Draft，不合并；
- `release-4.1.5`：未修改。
