# Deployment 编辑设置专项 VERIFY（2026-10-22）

> 本文记录的是当前 V4 原生表单在已执行场景下的运行时证据，不等于 V3 编辑设置已经完成等价迁移。编辑设置的 REA 复核结果见[专项 REA 记录](./workload-settings-rea-20261022.md)。在 REA 行为矩阵闭环前，本记录不能单独将该功能标记为已验收。

## 范围和结论

本轮专项来自负责人询问“编辑设置是否测试过”。此前首轮 Workload 记录覆盖列表、详情页签和删除，没有覆盖编辑设置提交，不能从首轮记录推导该功能通过。本轮只操作 `v4-migration-e2e` 中带 `v4-migration-run=settings-20261022` 标签的专用 Deployment 和 ConfigMap，使用真实浏览器原生表单并回读 Kubernetes API。

分支 `feature/v4-workloads`，Worktree `/home/bruce/code/ks-develop/console-workloads`，集成基线 `3e09afd6a051d4091b3c887462c880eff2ba6754`。PR #2 保持 Draft，目标 `feature/v4-migration`；未修改稳定分支。

## 发现的问题与修复

| 问题                                                    | 根因                                                                                                                          | 修复提交                                                                                                                            |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 编辑设置进入 YAML，没有容器/模板原生表单                | 菜单调用 `editYaml`                                                                                                           | `e3d4723112bdc9d8656d30a83306b864890b0497`：增加原生容器、探针、资源、环境变量、初始化容器、卷和挂载表单                            |
| 存在 projected 卷时保存被校验阻止；卷挂载标题显示翻译键 | 解析器仅保留五种常见卷类型；缺少翻译                                                                                          | `90fef5fa69f4e8a55dfce516311733f9f30cfdf3`：不支持编辑的卷来源原样保留，补翻译，保留命名端口及 HTTP headers；可清空只读/资源等字段  |
| 并发修改没有得到 409，原有注解被覆盖                    | `_originData` 经 `getOriginData` 移除 `metadata.resourceVersion`、UID 和 ownerReferences，关闭保存前 GET 仍不足以保证并发保护 | `dec969432b4caef73b650dcc48e9ff2e1da52e02`：打开设置时读取原始资源并固定为编辑快照；保存保留当时 resourceVersion                    |
| 网络中断后弹窗保留，但没有失败反馈                      | 弹窗只消费 mutation 的 loading/success；共享 request 在没有 response 时还会抛 TypeError，无法依赖全局提示                     | `dec969432`：展示弹窗内错误态，409 单独提示取消并重开；取消/重开清理旧错误。本轮未修改共享 request，其公共修复归 resource-framework |

额外发现长表单滚动时错误提示位于屏幕外（实测 y=-740.7）。提交 `9587f2c543ff123bf4e033148cc16015a5ea4929` 将错误提示置于滚动区域顶部固定显示；新增浏览器可视区域断言，最终制品已通过提示位于可视区域的断言与截图复核。

上述问题分别由真实浏览器保存/校验、实际并发注解修改、Playwright 对单个 PUT 请求的网络中断注入复现。网络中断注入只是浏览器故障场景，不等同于 API Server 实际宕机测试，也不能代替真实低权限 RBAC。

## 实际执行命令与本地结果

- `scripts/v4-module-gate.py workloads start`、`commit`、`deploy --tag …`：均通过；PR 阶段在最终文档提交并推送后执行。
- `./scripts/test.sh`：70 个文件、287 项通过、0 失败。
- 相关 `./node_modules/.bin/eslint …`：0 错误。
- `./node_modules/.bin/prettier --check …`、`git diff --check`：通过。
- `./node_modules/.bin/tsc --noEmit -p packages/console/tsconfig.json`：仍有 1316 条仓库级既有诊断，本轮改动文件直接诊断 0 条；不能记为完整 TypeScript 检查通过。
- `corepack yarn build:packages`：在 `dec969432` 上通过，耗时 240.49 秒；后续 `9587f2c54` 仅调整错误提示定位，由其精确 SHA CI 再完成生产构建。
- `gh workflow run build-personal-images.yml --ref feature/v4-workloads -f source_ref=feature/v4-workloads`：`dec969432` CI Run `39785391325` 成功；最终 `9587f2c54` 的 CI Run [39786947128](https://github.com/mysStack/console/actions/runs/39786947128) 成功，检出 SHA 与镜像代码一致。
- `kubectl set image` → `kubectl rollout status` → Deployment、Pod imageID 回读 → 新浏览器登录 → Playwright 操作 → Kubernetes API 回读：完整链路已执行并通过，身份与结果如下。

## 部署身份

| 项目         | 实际证据                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 最终代码 SHA | `9587f2c543ff123bf4e033148cc16015a5ea4929`                                                                                                                          |
| CI           | Run `39786947128`：单元测试、生产构建与镜像推送成功                                                                                                                 |
| 镜像         | `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261022-212830-9587f2c543ff@sha256:cf9e9d7f9400b273ca4711fa03c1d4668686ec42c2b0c6e9459d96b2034af923`             |
| Deployment   | `kubesphere-system/ks-console`，generation `583`，revision `533`，updated/ready `1/1`                                                                               |
| Pod          | `ks-console-69bbd8bd7-86wgh`，Running/Ready，重启 0                                                                                                                 |
| Pod imageID  | `ghcr.io/mysstack/ks-console@sha256:cf9e9d7f9400b273ca4711fa03c1d4668686ec42c2b0c6e9459d96b2034af923`                                                               |
| 回滚基线     | 部署前保存 revision `532`、1 副本及 `dec969432` 镜像，digest `sha256:2202e97ba5b1ce5022a0dd1626c41498e6afe8b86526c2a2c6fc5d62052fb1b7`；本次 rollout 成功，无需回滚 |
| 登录         | rollout 后新建 `workload-settings-final` 会话，从 `/login` 登录进入 `/dashboard`                                                                                    |

镜像拉取耗时约两分钟，最终在 240 秒 rollout 超时窗口内成功。此前 `90fef5fa` 定位轮次曾在 rollout 进行中打开页面，出现一次连接拒绝；rollout 后重新打开并成功登录，不计入登录通过证据。最终制品仅在 Ready 后执行登录。

前一轮定位制品为 `90fef5fa69f4` / Run `39783468777`，tag `feature-v4-workloads-20261022-210413-90fef5fa69f4`，digest `sha256:3eaf654e704c51edc39dce7c51ac8dbd42365d86b08069df0c6df666348e3dbe`。该制品已通过原生表单保存、取消、重新打开、资源/探针/镜像持久化、projected/Downward API/HTTP header 保留、emptyDir 新增和 ConfigMap envFrom 添加，但随后发现并发与错误提示缺陷，因此不作为最终通过证据。

## 最终制品浏览器场景

所有账号仅从 `.bashrc` 环境变量加载，测试代码与日志不保存账号或密码。最终截图限定设置弹窗，避免捕获登录信息。

| 场景                 | 最终制品实际结果                                                                                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 原生设置打开/渲染    | 原生容器、探针、资源、卷等表单可操作；操作路径无可见 iframe                                                                                                                                                  |
| 镜像与资源保存       | 镜像改为 `docker.io/library/nginx:alpine`、CPU 预留改为 `20m`；PUT `200`，API 回读和重开表单一致                                                                                                             |
| 原有字段保留         | projected 卷、Downward API 环境变量、HTTP headers、ownerReferences 原样保留；本轮专门给 Deployment 关联测试 ConfigMap 的 ownerReference 验证保留行为                                                         |
| HTTP 探针编辑        | 从 `/index.html` 改为 `/`，API 回读一致，实际 Pod Ready                                                                                                                                                      |
| ConfigMap 引用       | envFrom 前缀改为 `SETTINGS_`；API 和重开表单一致，Pod 内检查 `SETTINGS_MODE` 与测试值相等，未输出值                                                                                                          |
| 新增 emptyDir 和挂载 | 新增 `scratch-final` 后立即在挂载下拉框可选；保存 API `200`，Pod 内 `/scratch-final` 存在                                                                                                                    |
| 原有 projected 挂载  | Pod 内 `/runtime/namespace` 可读                                                                                                                                                                             |
| 取消                 | 将 CPU 预留临时改为 `99m` 后取消，API 仍为此前已保存的 `30m`                                                                                                                                                 |
| 非法名称             | `INVALID NAME` 被前端表单校验拒绝，不计为 API/RBAC 失败                                                                                                                                                      |
| 网络失败             | 仅拦截测试 Deployment 的 PUT 并 abort 一次；错误提示位于可视区域，表单保留，resourceVersion 未变化；重开清理旧错误                                                                                           |
| 实际 409             | 打开表单后用 kubectl 新增注解；保存返回 `409`，并发注解保留、CPU 未被覆盖，提示重新打开                                                                                                                      |
| 实际 422 与重试      | CPU request `200m` 高于 limit `100m`，实际 API 返回 `422`；spec 未变、提示可见；修正为 `30m` 后重试 `200`                                                                                                    |
| 路由/缓存            | 打开环境变量路由、刷新、返回，再次编辑，前缀和探针为最新保存值；当前路径无可见 V3 iframe                                                                                                                     |
| 工作负载生效         | `kubectl rollout status` 成功；`v4-settings-20261022-verify-56c6c66768-nnpv6` Running/Ready，nginx imageID `docker.io/library/nginx@sha256:df221db836e1754089190208cee7eeda94f233197056426eda74a43ab1abeac2` |

最终浏览器截图（本地生成物，不提交到 Git）：

- `output/playwright/deployment-settings-network-final.png`：长表单滚动后失败提示仍在可视区域，已实际查看截图。
- `output/playwright/deployment-settings-conflict-final.png`：实际 409 反馈。

执行入口为 `bash /home/bruce/.codex/skills/playwright/scripts/playwright_cli.sh -s=workload-settings-final run-code --filename <脚本>`；本轮脚本保存在 `/tmp/workload-native-settings-save.js`、`/tmp/workload-native-settings-errors.js`、`/tmp/workload-native-settings-422.js`、`/tmp/workload-native-settings-volume-final.js`。脚本为此次专用 fixture，不能对业务资源直接运行。

复现顺序：在测试 namespace 创建带唯一标签、replicas=0、nginx 容器、HTTP readiness headers、Downward API env/projected 卷的 Deployment 和测试 ConfigMap；执行保存与保留字段检查；在无待完成 rollout 时执行故障/冲突检查；执行 422 与修正重试；新增卷、引用前缀和探针修改；等待 rollout；用 `kubectl exec ... -- sh -c 'test ...'` 检查环境变量和挂载；刷新/返回/重开并验证取消。

清理说明：补充 UI 删除用例因测试使用了不存在的 dialog accessible name 而超时，实际 DELETE 未执行，不能计为通过。清理测试 ConfigMap 后，其 ownerReference 触发 Deployment 及派生资源 GC；之后通过 Kubernetes API/列表回读确认本轮 Deployment、ReplicaSet、Pod、ConfigMap 均不存在。测试 namespace 保留。此偏差不影响此前设置保存、失败反馈和 Pod 生效的取证，但本轮不新增“原生删除通过”结论。

## 尚未完成的验收边界

- 当前结论仅覆盖明确执行的编辑设置场景，不代表 Deployment 或 Workload 全部已验收。
- Secret/PVC/HostPath 等来源、全部探针组合、多容器/初始化容器高级组合、完整 RBAC、跨用户/集群缓存隔离、HPA、回滚/重启与全部 V3 功能逐项等价性仍需各自证据。
- 调度/亲和性、安全上下文等未纳入当前可编辑字段的内容应原样保留；原样保留不等于具有 V3 等价编辑能力。
- Pod Watch WebSocket `403` 继续登记，扩展接口兼容错误按负责人要求后置。
- 网络失败后共享 request 的异常类型问题单列为 resource-framework 依赖，不通过扩大本模块范围直接修改公共底座。
- StatefulSet、DaemonSet、Pod、Job、CronJob 后续继续按主计划和独立模块 Worktree 规则执行；本次不继承为这些资源的验收结论。
