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

## 2026-10-20 Kubernetes 资源接口扩展故障复测

为扩大实际故障覆盖范围，本轮在同一 131 测试环境再次使用已授权的 `kubectl debug node/dev01` 停止并恢复宿主机 K3s。浏览器登录后每 2 秒采样一次，共取得 103 组样本，未执行任何业务资源写入。

| 接口范围            | `200` | `502` | `503` | 结论                                                               |
| ------------------- | ----: | ----: | ----: | ------------------------------------------------------------------ |
| ConfigMap 列表      |    52 |    35 |    16 | 故障期间失败，恢复后正常                                           |
| Secret 列表         |    52 |    35 |    16 | 故障期间失败，恢复后正常                                           |
| ServiceAccount 列表 |    52 |    35 |    16 | 故障期间失败，恢复后正常                                           |
| Deployment 列表     |    52 |    35 |    16 | 故障期间失败，恢复后正常                                           |
| StatefulSet 列表    |    52 |    35 |    16 | 故障期间失败，恢复后正常                                           |
| DaemonSet 列表      |    52 |    35 |    16 | 故障期间失败，恢复后正常                                           |
| 应用列表 API        |   103 |     0 |     0 | 本轮未随 Kubernetes API 故障出现失败，不能据此推断其后端依赖已验证 |

恢复后，`readyz` 返回 `ok`，`dev01` 恢复为 `Ready`，`ks-console` Deployment 为 `1/1` Ready；实际运行 Pod 的镜像仍为 `feature-v4-configmaps-secrets-20261020-040218-4042f9570a8e`，imageID 对应 digest `sha256:1c59602033e75e14d60e769e1de25bf16db20e962a9d504ee40f991e5f879878`。恢复后的浏览器登录成功，ConfigMap、Secret、ServiceAccount 接口均返回 `200`。

恢复期间单节点资源不足导致 Console 新 Pod 短暂 Pending；删除旧的同镜像 Pod 后 Deployment 完成 rollout，最终只保留一个 Ready Pod。该现象记录为单节点资源约束，不能当作 API Server 故障本身的功能失败。

本轮扩大了 Kubernetes 资源列表的真实故障证据，但仍未覆盖全部页面、全部写操作、全部 V3 Action、全部 RBAC 组合和扩展初始化错误；应用列表接口未出现故障响应，也不能扩大解释为应用模块故障恢复已验证。

## 2026-10-21 写操作故障补测

为补齐此前只覆盖列表读取的缺口，本轮在专用 namespace 创建 ConfigMap `v4-api-fault-write-20261021`，先通过 Kubernetes API 确认 `data.state=before-fault`。随后按已授权方式停止 131 节点上的 K3s/API Server，在真实已登录浏览器会话内对同一资源依次执行 PATCH、DELETE，并对专用新资源执行 POST：

| 浏览器操作         | 请求                                                                                | 故障期间结果 | 恢复后核对                       |
| ------------------ | ----------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| 修改已有 ConfigMap | `PATCH /api/v1/namespaces/v4-migration-e2e/configmaps/v4-api-fault-write-20261021`  | `502`        | `data.state` 仍为 `before-fault` |
| 删除已有 ConfigMap | `DELETE /api/v1/namespaces/v4-migration-e2e/configmaps/v4-api-fault-write-20261021` | `502`        | 资源仍存在，未被删除             |
| 创建新 ConfigMap   | `POST /api/v1/namespaces/v4-migration-e2e/configmaps`                               | `502`        | 新资源不存在                     |

K3s 按计划恢复后，`/readyz` 返回 `ok`，`dev01` 恢复为 Ready；测试 ConfigMap 已删除，namespace 最终只保留系统 ConfigMap 和默认 ServiceAccount。该补测证明当前 Console 在 API Server 故障期间对写请求收到失败状态，未形成部分写入；它不覆盖所有资源类型的写操作，也不替代浏览器页面级错误提示和重试体验验证。

## 2026-10-20 当前制品第三次实际故障验证

本轮在当前分支 `b2bd7bf639ae0e42cbd92e4787d93dbf666a902a` 对应的 131 部署制品上重新执行了已授权的 API Server 故障验证。执行前确认 Kubernetes context 为 `default`、`dev01` 为 `Ready`、`/readyz` 为 `ok`，`ks-console` rollout 已完成；故障前部署镜像为
`feature-v4-configmaps-secrets-20261020-105412-1c54df98d124`，Pod 实际 imageID 为
`ghcr.io/mysstack/ks-console@sha256:49febd89201b7a887d30928ae31a3b296d459ed18dc7811b550a14719556fab2`。

使用真实登录后的浏览器会话，每 2 秒对以下接口采样一次，共取得 185 组样本：

- `ConfigMap`、`Secret`、`ServiceAccount` 的 namespace 列表接口；
- Deployment、StatefulSet、DaemonSet 的 namespace 列表接口；
- Application 列表接口作为不依赖 Kubernetes API Server 的对照组。

故障注入仍使用负责人已授权的 `kubectl debug node/dev01 --profile=sysadmin`，通过宿主机 `systemd` 停止 K3s，并预先安排 45 秒后启动恢复；故障结束后删除 debug Pod。采样结果如下：

| 接口范围            | 200 | 403 | 502 | 503 | 恢复后 |
| ------------------- | --: | --: | --: | --: | ------ |
| ConfigMap 列表      |  63 |   1 |  81 |  40 | 200    |
| Secret 列表         |  63 |   1 |  81 |  40 | 200    |
| ServiceAccount 列表 |  63 |   1 |  81 |  40 | 200    |
| Deployment 列表     |  63 |   1 |  81 |  40 | 200    |
| StatefulSet 列表    |  63 |   1 |  81 |  40 | 200    |
| DaemonSet 列表      |  63 |   1 |  80 |  41 | 200    |
| Application 列表    | 185 |   0 |   0 |   0 | 200    |

其中每个 Kubernetes 资源接口均出现了故障期间的 502/503，并在 K3s 恢复后返回 200；单次 403 是故障切换边界的瞬态授权结果，没有被当作 API Server 故障响应。恢复核验结果：`/readyz` 返回 `ok`，`dev01` 恢复为 `Ready`，`ks-console` rollout 成功，运行 Pod 为 `Running/Ready`，镜像 digest 未发生变化。故障注入没有创建、修改或删除业务资源。

恢复过程中单节点 CPU 不足使同一镜像旧 ReplicaSet 短暂保留 Pending 副本；删除该 Pending 测试副本并让旧 ReplicaSet 退出后，新的同镜像 Pod `ks-console-58794bfdc6-dc5j2` 达到 `Running/Ready`，Deployment 状态恢复为 `1/1/1/1`，实际 imageID 仍为上述 digest。该调度现象已单独记录，不能误判为 API Server 故障导致的 Console 功能失败。

本轮将“API Server 实际故障环境验证”标记为**已完成（限定上述列表接口和恢复链路）**。它仍不代表所有页面、所有写操作、所有动态 Action 或全部 V3 功能在 API Server 故障期间均已验证。

## 2026-10-20 当前 Workload 原生制品第四次实际故障验证

为确认项目 Workload V3 兼容桥清理后的实际制品仍能完成故障恢复链路，本轮在提交 `d091cb1cdc3d271e1632ed569decc9aeac75fb31` 对应的 131 部署上重新执行真实 K3s/API Server 故障验证。故障前部署镜像为 `feature-v4-configmaps-secrets-20261020-171341-d091cb1cdc3d`，manifest digest 为 `sha256:1b82acae4539989150585dfd3e68376ad9bbb957302d82adb98bb19b4d58ce6e`；故障前 `/readyz` 为 `ok`、`dev01` 为 Ready、`ks-console` 为 `1/1` Ready。

真实登录浏览器每 2 秒并行采样 7 个接口，共 60 组样本。Kubernetes 资源列表接口的结果如下：

| 接口范围            | 200 | 502 | 503 | 其他 | 结论                         |
| ------------------- | --: | --: | --: | ---: | ---------------------------- |
| ConfigMap 列表      |  24 |  24 |  12 |    0 | 故障期间失败，恢复后回到 200 |
| Secret 列表         |  24 |  25 |  11 |    0 | 故障期间失败，恢复后回到 200 |
| ServiceAccount 列表 |  24 |  25 |  11 |    0 | 故障期间失败，恢复后回到 200 |
| Deployment 列表     |  24 |  25 |  11 |    0 | 故障期间失败，恢复后回到 200 |
| StatefulSet 列表    |  24 |  25 |  11 |    0 | 故障期间失败，恢复后回到 200 |
| DaemonSet 列表      |  24 |  25 |  11 |    0 | 故障期间失败，恢复后回到 200 |
| Application 列表    |  60 |   0 |   0 |    0 | 对照接口全程保持 200         |

故障注入使用已授权的 `kubectl debug node/dev01 --profile=sysadmin`，通过宿主机 systemd 在 45 秒后恢复 K3s；没有修改业务资源。恢复后 `/readyz=ok`、`dev01=True`，`ks-console` Deployment `550/550` 且副本为 `1/1/1/1`，最终 Pod `ks-console-74899889df-gp9lq` 为 Running/Ready，实际 imageID 与上述 digest 一致。4 个临时 debug Pod 已删除。

单节点资源不足使恢复期间出现同镜像 Pending 副本；删除 Pending/旧副本后 Deployment 完成 rollout，未改变制品或业务资源。该现象作为环境资源约束记录，不作为 API Server 故障功能结果。该次复测将 API Server 实际故障证据更新到当前 Workload 原生制品，但仍只覆盖上述列表接口和恢复链路。
