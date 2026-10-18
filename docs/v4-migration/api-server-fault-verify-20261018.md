# API Server 实际故障环境验证记录

> 核对日期：2026-10-18（上海时间）  
> 目标环境：`192.168.2.131:30880` / Kubernetes context `default`  
> 当前制品：`8c6262d97`，manifest digest `sha256:bf6577ccdaddd314e478b4ba7235865e695a705c1f50cc7ec132152566b3652c`

## 当前健康证据

本轮只读检查确认：

- Kubernetes Server 为 `v1.31.13+k3s1`；
- `kubectl get --raw='/readyz?verbose'` 返回 `readyz check passed`，各项 apiserver、etcd 和 informer 检查均为 `ok`；
- `dev01` 为 `Ready`，角色为 `control-plane,etcd,master`；
- `kubesphere-system/ks-console` 当前 `generation/observedGeneration=515/515`，副本 `1/1` Ready；
- 当前 Pod 为 `ks-console-959cd4457-vxk5m`，Pod imageID 与上述制品 digest 一致；
- `v4-migration-e2e` 保留，未发现本轮 RBAC 矩阵使用的临时用户、绑定或测试资源残留。

## 已完成的替代性错误态验证

此前已在真实 Playwright 浏览器中对 ConfigMap 列表 API 做请求路由拦截，页面显示 `Network Error`，并确认没有再抛出无 response 异常。该验证只证明前端网络错误处理，不等价于 API Server 实际不可用。

## 实际故障注入当前未执行

目标集群是单节点 K3s，`dev01` 同时承担 control-plane、etcd 和 master。停止或重启 K3s/API Server 会影响共享测试集群的所有 API 请求，超出当前已授权的 namespace 内资源创建、修改、删除范围。当前工作站也没有本地 K3s 服务可供安全替代；不能把停止本机服务当作目标环境验证。

因此本轮没有执行以下任何操作：

- 停止或重启远程 K3s/API Server；
- 修改 apiserver、etcd、网络或节点服务；
- 通过破坏性方式制造集群级 5xx、连接拒绝或超时；
- 把 Playwright `route`、浏览器离线或 API 路由拦截结果记录为真实 API Server 故障。

## 后续执行门槛

要关闭本项，必须由项目负责人明确授权一次可回滚的共享集群故障窗口，并提供已确认可用的远程维护方式。执行前需要记录：

1. `readyz/livez`、节点状态、`ks-console` Deployment/Pod、副本数、镜像 digest 和当前资源基线；
2. 故障注入的具体对象、开始时间、预计最长中断时间和恢复命令；
3. 浏览器登录、ConfigMap/Secret/ServiceAccount 列表请求、错误提示和网络状态；
4. 恢复后的 apiserver 健康、节点 Ready、Console Pod Ready、镜像身份和登录/列表回归；
5. 只清理本轮专用资源，不删除 `v4-migration-e2e` 或其他既有数据。

在获得上述授权和维护入口前，本项状态保持“未验证/外部授权待补”，不影响已完成的前端网络错误处理证据，但不能作为 API Server 故障验收通过。
