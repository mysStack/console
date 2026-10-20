# 2026-10-21 三项验证收口报告

本报告汇总当前 `feature/v4-configmaps-secrets` 分支和 131 测试环境的三项专项验证状态。报告只引用真实浏览器、Kubernetes API、集群状态和当前源码扫描证据；“部分验证”“未验证”和“环境不可执行”不视为通过。

## 1. 完整 RBAC 组合矩阵

### 已取得证据

| 资源或入口                         | 已验证组合                                                                        | 证据范围                                                                                |
| ---------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| ConfigMap、Secret、ServiceAccount  | 项目 viewer、operator、admin、workspaceonly、projectonly、clusterviewer；平台只读 | 真实浏览器/API 的读取、创建、更新、删除和拒绝状态码；`projectonly` 保留历史账号结果差异 |
| Deployment、StatefulSet、DaemonSet | viewer、operator、admin、workspaceonly、projectonly、clusterviewer；平台只读      | 真实浏览器/API 的读取、写入和拒绝边界；`projectonly` 结果不一致，未作为稳定通过结论     |
| 应用模板 A09/A12                   | workspace viewer、workspace 管理员、平台全局只读、当前管理员                      | 真实浏览器的列表、创建拒绝、Chart 校验/上传、刷新、删除和清理                           |

### 尚未闭环

- DevOps API/扩展当前不可用，相关请求为 `404`，没有可执行的真实业务 fixture。
- Federation、EdgeWorkload 和 FederatedProject/FederatedResource CRD 或 fixture 不存在，不能执行正向、拒绝、错误、取消和刷新组合。
- Extension 专用组合没有建立；扩展初始化错误按负责人要求延期。
- 应用模板工作空间级拒绝、冲突/网络失败和全部动态 Action 尚未逐项验证。
- `projectonly` 在不同临时账号上下文出现不同结果，根因未证明，不能按稳定组合关闭。

结论：**完整 RBAC 组合矩阵未完成**。当前已验证的资源和组合只能作为部分证据，不能外推到缺少 fixture 的模块。

## 2. 全部 V3 功能逐项等价性

当前矩阵按 A01～A12 记录：

| Action                    | 当前状态                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A01 ConfigReference       | 部分验证；有原生引用和持久化证据，仍有兼容入口、低权限和完整错误路径缺口                                             |
| A02 Deployment            | 部分验证；原生详情、合法/非法 YAML、冲突、回退、重新创建、删除和部分 RBAC 已验证，完整操作组合及 V3 运行时清理未完成 |
| A03 StatefulSet           | 部分验证；原生详情、合法/非法 YAML、冲突、回退、重新创建、删除和部分 RBAC 已验证，完整等价未完成                     |
| A04 DaemonSet             | 部分验证；原生详情、合法/非法 YAML、冲突、回退、重新创建、删除和部分 RBAC 已验证，完整等价未完成                     |
| A05 Edge 应用模板创建     | 未验证；没有 Edge fixture                                                                                            |
| A06 DevOps 编辑           | 未验证；DevOps 后端能力不可用                                                                                        |
| A07 DevOps 创建           | 未验证；DevOps 后端能力不可用                                                                                        |
| A08 通知设置              | 未验证；当前入口仍加载兼容资源，未证明 V4 替代行为                                                                   |
| A09 应用模板创建          | 部分验证；有原生模板选择/安装和 RBAC 子路径，完整失败、取消、返回和 V3 替代未完成                                    |
| A10 EdgeWorkload 批量删除 | 未验证；没有 EdgeWorkload fixture                                                                                    |
| A11 应用部署              | 部分验证；普通 Helm 安装成功，Edge 分支未触发                                                                        |
| A12 应用模板编辑/制品     | 部分验证；原生编辑、上传、刷新、删除和错误子路径已有证据，完整等价和运行时清理未完成                                 |

业务源码快照 `99ec26932e11927ae33fa8dd054ca24d4d75c0b4` 重新扫描后，仍有 6 个业务文件直接调用 `useV3action`，另有 3 个桥接/导出文件；排除 `lib`、`node_modules` 和测试文件后，源码匹配 `WujieReact`、`wujie-react`、`ConsoleV3ResourceList`、`consolev3` 或 `v3dist` 的文件数为 141。当前制品浏览器仍可观测 `/consolev3/dashboard` 和 `/dist/v3dist/*`。

结论：**全部 V3 功能逐项等价性未完成**。环境缺失 fixture 的 Action 不能以空列表、入口可达或页面渲染代替成功等价。

## 3. API Server 实际故障环境验证

该项已在负责人授权的维护窗口内执行真实 K3s 停止/恢复测试：

- 读取链路：ConfigMap、Secret、ServiceAccount、Deployment、StatefulSet、DaemonSet 列表请求在 API Server 不可用期间取得 `502/503`，恢复后返回 `200`。
- 写入链路：上述六类资源的临时 PATCH、POST 在故障期间失败；DELETE 为连接级失败；恢复后已有对象未被部分写入，新对象不存在。
- 浏览器页面：故障期间 ConfigMap 页面保留故障前旧列表，没有显式错误页或重试提示；恢复后 `readyz`、节点、Console rollout 和页面刷新恢复正常。
- 当前部署：镜像 tag `feature-v4-configmaps-secrets-20261021-013709-4b5c7f5670c4`，Pod imageID 对应 manifest digest `sha256:ffe166aa35e105d463e3b1d37e14fca3595088706e1eecfe5daf7c97518fb3ac`。
- 清理：debug Pod、临时资源和故障测试对象均已清理；测试 namespace 保留。

结论：**API Server 实际故障环境验证已完成限定范围**。页面显式错误、自动重试和恢复后的缓存策略表现仍记录为待改进项；该项不等同于全部 V3 Action 的故障测试。

## 当前总判定

三项中，API Server 实际故障验证已完成限定范围；完整 RBAC 组合矩阵和全部 V3 功能逐项等价性仍未完成。PR #1 继续保持 Draft，未进入合并或发布。

2026-10-21 的只读就绪性复核显示，`devops`、`kubefed`、`kubeedge`、`whizard-notification` 均没有 `Installed` 状态，`FederatedProject`、`FederatedResource`、`EdgeWorkload` 目标 CRD 不存在；当前扩展 APIService 列表也没有这些目标 API。当前有效 `projectonly` 账号的 GET `200`、写入 `403` 已重复复核，早期无法复现的全 `403` 只保留为历史异常。

当前制品入口复核进一步确认：项目 Edge 页面只是普通应用列表，没有 EdgeWorkload fixture；DevOps 页面因扩展未安装停留在集群选择；通知静默策略页面仍加载 `/consolev3`/`v3dist` 且 silences API 为 `400`。这些入口可达性结果不能替代 A05～A08、A10 的逐项等价测试。

API Server 故障浏览器层覆盖已扩大到 Secret 和 ServiceAccount：两页在故障期间均保留旧列表数据且没有显式错误/重试提示，恢复后页面刷新正常。该结果强化了实际故障链路证据，同时确认页面错误反馈和缓存策略尚未通过验收。

扩展 RBAC 已新增一条真实边界证据：全局只读用户可以读取扩展列表，但进入已安装扩展详情时制品文件读取返回 `403` 并进入权限错误页；安装/卸载和扩展运行时仍未验证。

扩展 RBAC 现有管理员对照：管理员可完整读取 `frontend-forge` 详情和制品文件（均为 `200`），全局只读用户可读取列表但制品文件为 `403` 并进入权限错误页。该证据仍不覆盖安装/卸载写权限或扩展运行时行为。

本轮在 `rbac-matrix-131-verify-20261018.md` 增加了 A01～A12 的 RBAC 组合覆盖台账，逐项列出已验证组合、部分验证、环境阻塞和未验证路径。该台账用于防止把资源级 CRUD 结果外推为全量矩阵，未改变“完整 RBAC 组合矩阵未完成”的判定。

同一轮新增了工作空间管理员与项目资源的隔离证据：仅绑定 `test-workspace-admin` 的账号可以读取工作空间应用模板列表，但对项目 ConfigMap、Secret、ServiceAccount、Deployment 的页面和 API 读取均为 `403`。该证据补强了 `workspaceonly` 的拒绝边界，不能替代项目、集群、平台、联邦、DevOps、Edge 和扩展组合的逐项验证。

随后新增集群管理员正向组合：临时账号绑定 workspace viewer 和集群 `cluster-admin`，在真实浏览器中对 ConfigMap、Secret、ServiceAccount、Deployment 完成列表、详情、POST、PATCH、PUT、DELETE，结果分别为 `200/200/201/200/200/200`。该证据补齐当前可用核心资源的集群管理员正向边界，但不改变完整 RBAC 矩阵未完成的结论。

同一制品又复核了工作空间 viewer 的应用模板边界：页面正常渲染空列表且没有创建入口；应用模板列表 GET 为 `200`，POST/PUT/PATCH/DELETE 均为 `403`。该结果补齐 A09/A12 的 workspace viewer 读取与写入拒绝路径，仍不能外推到其他作用域或全部 V3 Action。

本轮在当前分支再次执行 `./scripts/test.sh`，66 个测试文件、210 个测试全部通过，0 个失败。该回归结果不改变 A01～A12 中仍未取得运行时等价证据的项目状态。

本轮继续验证 A09/A12 的 `projectonly` 和 `clusterviewer`：两组真实浏览器页面均可读取应用模板列表，API GET 为 `200`，POST/PUT/PATCH/DELETE 均为 `403`。该结果补齐两组作用域的读写边界，但不代表应用模板成功、失败、冲突、取消或 V3 替代行为已完成。

随后补测 `workspace regular` 和仅集群 viewer 的 `clusteronly`，两组页面列表均可读取，GET 为 `200`，POST/PUT/PATCH/DELETE 均为 `403`。A09/A12 的当前作用域读写边界已进一步完整化，但全量 RBAC 和应用模板 V3 等价仍未完成。

当前源码回归测试 8 个文件、15 个测试全部通过，但其中 `consoleV3Details.test.ts` 明确保留 Services/Volumes 的共享 `consolev3` 实例；该证据支持已迁移 Workload 和配置资源边界稳定，也确认全量 V3/Wujie 清理尚未完成。

仓库标准回归 `./scripts/test.sh` 已通过：66 个文件、210 个测试，0 个失败。由于测试集合包含当前仍保留的 `ConsoleV3ResourceList`、`consolev3` 和扩展兼容边界，该结果不能替代全量 V3/Wujie 运行时等价验证。

2026-10-21 在当前部署制品上补测 A02 Deployment 管理员自动扩缩：真实浏览器提交 CPU `50%`、内存 `128Mi`、副本范围 `1～2`，HPA 创建返回 `201`、Deployment 更新返回 `200`；API 回读确认 HPA 目标和状态，刷新后页面数据保持一致。临时 HPA 与 Deployment 已清理。该结果只增加 A02 的成功子路径，不改变 A02～A04、完整 RBAC 和全量 V3 等价性的未完成结论。

同一轮在 StatefulSet 上完成管理员自动扩缩成功路径复核：HPA 创建返回 `201`，`scaleTargetRef` 指向 StatefulSet，API 回读确认 CPU/内存目标和 `1～2` 副本范围，页面刷新后设置保持一致；临时 HPA、StatefulSet 和 Pod 已清理。该结果只增加 A03 成功子路径，DaemonSet及其他权限、错误和 V3 等价条件仍未完成。

对临时 DaemonSet 的原生详情菜单复核显示回退、编辑设置、编辑 YAML、重新创建和删除入口，但没有“编辑自动扩缩”。该结果只记录当前 V4 操作边界，尚未证明与 V3 操作集合等价，A04 仍为部分验证。

A12 重复上传补测显示：相同 Chart 名称/版本连续上传两次时，校验和创建请求均返回 `200`，系统生成两个不同模板名称，未返回 `409`；两个临时对象已删除并经刷新复核列表为空。该结果记录了当前制品的重复上传语义，但没有 V3 对照证据，A12 冲突等价仍未关闭。
