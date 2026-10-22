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
| 与当前分支关系        | 历史运行制品；不是当前 `feature/v4-workloads` HEAD `b57ce0e24`                                        |

## 2. StatefulSet 设置页面

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

## 3. 网络请求观察

浏览器请求列表只读筛选得到以下成功 GET 请求：

| 请求                                                                                                           | 状态  | 作用                      |
| -------------------------------------------------------------------------------------------------------------- | ----- | ------------------------- |
| `/clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/statefulsets/v4-watch-sts-20261022-01`                | `200` | 读取 StatefulSet 原始详情 |
| `/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/statefulsets`               | `200` | 读取项目 StatefulSet 列表 |
| `/clusters/host/kapis/resources.kubesphere.io/v1alpha3/namespaces/v4-migration-e2e/pods?...ownerReference=...` | `200` | 读取关联 Pod              |
| `/clusters/host/api/v1/namespaces/v4-migration-e2e`                                                            | `200` | 读取 namespace            |
| `/kapis/iam.kubesphere.io/v1beta1/users/admin/roletemplates?scope=namespace&namespace=v4-migration-e2e`        | `200` | 读取项目权限模板          |

本次没有读取请求头、Cookie、Token 或请求体，也没有执行 PATCH、PUT、POST、DELETE。

## 4. 结论和边界

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

因此本证据只作为 REA 输入，当前阶段仍为 **REA / 分析中，待负责人复核**，不进入 DEV，不改变 `rea.review: null`。
