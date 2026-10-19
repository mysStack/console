# API Server 实际故障环境验证记录

> 最近核对：2026-10-19（上海时间）
> 目标环境：`192.168.2.131:30880` / Kubernetes context `default`
> 验证范围：ConfigMap、Secret、ServiceAccount 列表 API、页面错误反馈和恢复后回归
> 执行模式：单 Codex 会话；未启动子 Agent；未修改业务代码

## 结论

本轮完成了一次真实的 131 API Server 故障注入、恢复和浏览器回归。故障期间，Console 代理的三个资源列表请求从 `200` 变为 `502`；恢复后 Kubernetes API、Console Deployment、Pod 和三个列表页面均恢复正常。

该证据关闭“真实 API Server 故障尚未执行”的环境验证缺口，但只证明当前三个资源列表在 API 不可用和恢复后的行为。它不等同于全部页面、全部 V3 Action 或全局扩展错误已经完成验证。

## 故障前基线

- Kubernetes context：`default`。
- Kubernetes Server：`v1.31.13+k3s1`。
- `dev01`：`Ready`，角色为 `control-plane,etcd,master`。
- `kubectl get --raw='/readyz?verbose'`：通过，检查项为 `ok`。
- `kubesphere-system/ks-console`：Deployment `generation/observedGeneration=519/519`，副本 `1/1` Ready。
- 故障前 Pod：`ks-console-797469cf84-mgndq`，`Running/Ready`。
- 部署镜像 tag：`feature-v4-configmaps-secrets-20261018-225142-1f711bb66b3b`。
- 故障前后使用同一镜像 manifest digest：`sha256:5fc81a366fc59ebd9c3d19e57eb6c8d0a1d70453748c622324a0a8c16b8afc02`。
- 测试 namespace：`v4-migration-e2e` 保留；故障注入只使用临时 debug Pod，没有删除该 namespace 或既有业务数据。

## 故障注入和恢复

项目负责人授权使用 `kubectl debug node/dev01`，通过宿主机 shell 停止和恢复 K3s，最长中断时间为 5 分钟。本轮执行的核心命令如下，恢复动作由宿主机 systemd timer 延迟 45 秒执行：

```bash
kubectl debug node/dev01 --profile=sysadmin --image=busybox:1.36 --attach=true --quiet -- \
  sh -c 'chroot /host /bin/sh -c "systemd-run --unit=codex-k3s-recovery-20261019 --on-active=45s /bin/systemctl start k3s; /bin/systemctl stop k3s; sleep 75"'
```

执行结果：

1. debug Pod 成功创建并执行宿主机 K3s 停止命令。
2. systemd 返回了 `codex-k3s-recovery-20261019.timer` 和对应 service 的调度结果。
3. K3s 停止期间，Console 资源请求进入 502；未执行 apiserver、etcd、网络或节点文件的其他修改。
4. K3s 由预先安排的 timer 恢复，之后 `readyz`、节点和 Console 均恢复正常。
5. 故障注入完成后删除临时 Pod：

```bash
kubectl delete pod node-debugger-dev01-s4grv --ignore-not-found
```

返回 `deleted`，未留下本轮 debug Pod。

## 浏览器和 API 证据

浏览器监控在故障注入前登录并打开 ConfigMap、Secret、ServiceAccount 列表，随后每约 2 秒请求一次以下三个资源接口，单次请求超时为 3 秒：

- `/api/v1/namespaces/v4-migration-e2e/configmaps`
- `/api/v1/namespaces/v4-migration-e2e/secrets`
- `/api/v1/namespaces/v4-migration-e2e/serviceaccounts`

监控实际采集 35 组样本：

| 样本范围 | ConfigMap | Secret | ServiceAccount | 说明                            |
| -------- | --------: | -----: | -------------: | ------------------------------- |
| 0–10     |       200 |    200 |            200 | 故障前基线                      |
| 11       |       502 |    502 |            502 | API 不可用开始后的过渡样本      |
| 12–34    |       502 |    502 |            502 | K3s/API Server 停止期间持续失败 |

故障恢复后，浏览器重新加载三个页面：

- ConfigMap 页面正常渲染，显示测试 namespace 当前对象，列表总数为 1；
- Secret 页面正常渲染，列表总数为 4；页面和证据未输出 Secret 明文值；
- ServiceAccount 页面正常渲染，显示 `default`，列表总数为 1；
- 三个页面路由、资源请求和页面数据均恢复，没有停留在错误页或空白页。

本轮真实登录成功，未在文档、日志、截图或测试结果中记录用户名、密码、Token、Kubeconfig 或 Secret 值。

## 恢复后集群证据

- `kubectl get --raw='/readyz?verbose'`：通过。
- `dev01`：恢复为 `Ready`。
- `ks-console` Deployment：`generation/observedGeneration=520/520`，副本 `1/1/1/1`（desired/ready/updated/available）。
- 恢复后 Pod：`ks-console-7796c9d77f-zq5f7`，`Running/Ready`，重启次数为 0。
- 恢复后 Pod 实际 imageID：`ghcr.io/mysstack/ks-console@sha256:5fc81a366fc59ebd9c3d19e57eb6c8d0a1d70453748c622324a0a8c16b8afc02`。
- 恢复后镜像 tag 与故障前一致，未发生业务制品切换。

K3s 恢复过程中 Console Pod 由 ReplicaSet 重建，但最终运行镜像 digest 未改变，且新 Pod 已 Ready。集群中原有的节点卷、Traefik 和其他工作负载告警没有作为本轮故障结果处理或删除。

## 验证边界和未完成项

- 已证明真实 K3s/API Server 不可用时，三个目标资源列表的请求会收到 502，页面可在恢复后重新获取并渲染数据。
- 已证明恢复后 API readiness、节点、Console rollout 和 Pod image identity 均回到可用状态。
- 未逐项覆盖所有 Console 页面、所有 API、所有 V3 Action、全部 RBAC 组合和扩展初始化错误；扩展运行时错误按负责人指令延期。
- 全部 V3 功能等价性仍未完成，详见 [`v3-action-equivalence-matrix-20261018.md`](./v3-action-equivalence-matrix-20261018.md)。
- 本项不能替代 ConfigMap、Secret、ServiceAccount 的其他模块级 VERIFY 条件，也不改变全局 P0“分析中，待负责人复核”状态。

## 历史记录

在本次授权前，文档曾记录“实际故障注入未执行”，当时只有 Playwright 请求拦截得到的 `Network Error` 证据。该历史记录解释了前一版本的状态；本节以上述 2026-10-19 实际执行结果为准，不能再把本项标记为“未执行”。
