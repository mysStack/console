# Workload V3 运行时 REA 补证

## 1. 目标和制品身份

本次只读观察用于补齐 Deployment、StatefulSet、DaemonSet 的旧 V3 设置页面、请求入口和字段分区。没有点击“确定”，没有提交任何资源变更，也没有把该制品作为当前分支 VERIFY 结果。

| 项目                  | 结果                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| 访问地址              | `http://192.168.2.131:30880`                                                                          |
| Kubernetes context    | `default`                                                                                             |
| `ks-console` 镜像 tag | `feature-v4-workloads-20261022-215739-27aaeced74e8`                                                   |
| Pod imageID           | `ghcr.io/mysstack/ks-console@sha256:919492fedf5eae6ee27fca84bb490897e557659ae79860b9e3f035e59c5f9179` |
| Pod                   | `ks-console-6b9c55b7b5-2v5fg`                                                                         |
| Pod 状态              | `1/1 Ready`                                                                                           |
| 与当前分支关系        | 历史运行制品；不是当前 `feature/v4-workloads` HEAD `551bdd284`                                        |

## 2. Deployment 设置页面

使用同一已登录浏览器会话只读打开：

```text
/consolev3/clusters/host/projects/v4-migration-e2e/deployments/v4-watch-20261022-02/resource-status
```

页面观察结果：

- 详情页提供“回退”“编辑设置”“编辑 YAML”“重新创建”“删除”等入口。
- “编辑设置”弹窗包含“更新策略”“容器”“存储”“容器组调度规则”“容器组优雅终止”分区。
- 更新策略显示滚动更新，当前“最大不可用容器组数量”为 `25%`，“最大新增容器组数量”为 `25%`。
- 容器分区显示 `web` 容器、镜像 `nginx:alpine`；本次页面未观察到资源限制配置。
- 存储分区提供挂载卷以及挂载 ConfigMap/Secret 的入口。
- 调度分区显示默认调度规则，优雅终止分区显示终止宽限时间 `30` 秒。
- 详情页显示副本数 `1`、端口 `http/TCP/80`；本次未点击“确定”，没有写入资源。

这组证据确认旧 V3 Deployment 设置页的页面分区、默认值和配置引用入口。它不能证明当前 V4 已实现 Deployment 的全部设置等价；当前源码仍需要补齐三类资源的完整字段、校验、写入和错误行为证据。

## 3. DaemonSet 设置页面

使用同一已登录浏览器会话只读打开：

```text
/consolev3/clusters/host/projects/v4-migration-e2e/daemonsets/v4-watch-ds-20261022-01/resource-status
```

页面观察结果：

- 详情页提供“回退”“编辑设置”“编辑 YAML”“重新创建”“删除”等入口。
- “编辑设置”弹窗包含“更新策略”“容器组”“存储”“容器组优雅终止”四个分区，没有观察到 Deployment 的副本数编辑入口。
- 更新策略显示滚动更新，当前“最大不可用容器组数量”为 `1`，“容器组就绪最短运行时长”为 `0` 秒。
- 容器组分区提供容器配置入口；详情页关联 Pod 为 `v4-watch-ds-20261022-01-nllzs`，状态为 Running、就绪 `1/1`。
- 详情页显示项目 `v4-migration-e2e`、节点 `dev01（192.168.2.131）` 和 Pod IP `10.42.0.160`。
- 本次只打开编辑弹窗和读取字段，没有点击“确定”，没有执行 PATCH、PUT、POST 或 DELETE。

这组证据确认旧 V3 DaemonSet 设置页与 Deployment/StatefulSet 的资源差异，尤其是滚动更新字段和没有副本数编辑入口。当前源码中的通用 `stopDeployment` 仍按 Deployment 的 `spec.replicas=0` 处理，DaemonSet 的原生动作语义尚未闭环。

## 4. StatefulSet 设置页面

使用已经登录的浏览器会话只读打开：

```text
/consolev3/clusters/host/projects/v4-migration-e2e/statefulsets/v4-watch-sts-20261022-01/resource-status
```

页面观察结果：

- 详情页显示“编辑服务”“编辑设置”“编辑 YAML”“重新创建”“删除”等操作。
- “编辑设置”弹窗包含“更新策略”“容器”“容器组优雅终止”“存储”“容器组调度规则”五个分区。
- 更新策略页显示“滚动更新（推荐）”和“容器组副本分组序号”，当前值为 `0`。
- 容器页显示容器 `web` 和镜像 `nginx:alpine`，同时存在“添加容器”入口。
- 优雅终止页显示终止宽限时间当前值 `30` 秒。
- 存储页提供挂载卷、挂载 ConfigMap/Secret 的入口。
- 调度页显示默认调度规则。
- 弹窗底部“确定”在没有修改时为禁用状态；本次只点击分区，没有点击确定。

这组证据确认旧 V3 StatefulSet 设置页的分区和资源特有的 partition、Service/存储入口。它不能证明当前 V4 已实现等价页面；当前源码仍显示 StatefulSet 的 `editConfigTemplate` 调用 YAML 编辑器。

## 5. 网络请求观察

浏览器请求列表只读筛选得到以下成功 GET 请求：

| 请求                                                                                                           | 状态  | 作用                      |
| -------------------------------------------------------------------------------------------------------------- | ----- | ------------------------- |
| `/clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/statefulsets/v4-watch-sts-20261022-01`                | `200` | 读取 StatefulSet 原始详情 |
| `/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/statefulsets`               | `200` | 读取项目 StatefulSet 列表 |
| `/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/pods?...ownerReference=...` | `200` | 读取关联 Pod              |
| `/clusters/host/api/v1/namespaces/v4-migration-e2e`                                                            | `200` | 读取 namespace            |
| `/kapis/iam.kubesphere.io/v1beta1/users/admin/roletemplates?scope=namespace&namespace=v4-migration-e2e`        | `200` | 读取项目权限模板          |

本次没有读取请求头、Cookie、Token 或请求体，也没有执行 PATCH、PUT、POST、DELETE。

## 6. 结论和边界

已补齐：

- 旧 V3 StatefulSet 设置页的实际分区和可见默认值。
- 当前部署制品的页面 URL、镜像 tag、Pod imageID 和只读请求路径。
- 旧 V3 详情页操作入口与 namespace 作用域。

仍未关闭：

1. 当前 V4 的 StatefulSet、DaemonSet 原生设置实现。
2. 当前 SHA 的构建制品、部署后页面和 Network/API 持久化。
3. Deployment、StatefulSet、DaemonSet 的完整字段清空/保留和错误路径。
4. 低权限 RBAC、跨 namespace 隔离、缓存失效和取消/冲突路径。
5. 集群级 Workload 列表的 Wujie/V3 替换。

本证据只作为 REA 输入。负责人随后批准进入 DEV，具体依据见 [REA 复核结论](./workload-rea-review-20261023.md)；本证据本身不证明当前 V4 已验收。
