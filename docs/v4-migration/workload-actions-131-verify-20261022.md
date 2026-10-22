# 项目 Workload 操作与错误反馈验证（2026-10-22）

## 范围与结论边界

本轮顺序处理项目 Deployment、StatefulSet、DaemonSet 列表的操作正确性，延续模块级 `REA → DEV → VERIFY → PR`，不重复全局 P0 扫描，不使用子 Agent。原生创建向导、全部 V3 动作等价、完整低权限组合及跨 namespace/集群隔离不在本轮通过结论之内。三个模块仍为开发中，不标记为已验收。

核心源码提交：

| Git SHA                                    | 内容                                                               |
| ------------------------------------------ | ------------------------------------------------------------------ |
| `412358f5f0424801688c99ea4340fb83dda197b5` | 本轮起点：三个项目 Workload 列表切换为原生实现                     |
| `b08d3421e6d2ddc67874f51f9fd31e07702cddbd` | 单个/批量删除、批量停止及直接 batchDelete 在请求失败时传播原始错误 |
| `b329aae2657a38f5e8d494cf9cb04e974e23fb18` | 行操作和批量操作使用项目权限作用域；行数据保留路由 cluster         |
| `7961eaedce6626e33b17a2b3399c41ce772e6206` | 成功后刷新当前表格；复用 StatusReason 展示实际原因并保留描述回退   |

现有四个 Worktree、历史提交和未跟踪生成物保留；`release-4.1.5` 未修改；PR #1 保持 Draft、不合并。PR 仍混合历史范围，模块完成后仍需按原要求分开评审，不能将本轮独立提交等同于 PR 已拆分。

## 定位与最小改动

1. 共享 Store 使用 `Promise.allSettled` 后直接返回结果，拒绝请求也成为已兑现的 Promise，导致 React Query 触发成功回调。修复后仍等待全部请求完成，存在拒绝结果时抛出原始错误，保留成功返回形状、DeleteOptions 和已有 HPA 清理路径。
2. 第一版镜像部署后，真实浏览器发现项目列表有创建按钮，但行操作和批量勾选缺失。对应两个权限 Hook 仅收到 `{ cluster }`，未按项目规则授权。修复为完整路由参数；补充行数据 cluster，防止批量请求丢失目标集群。
3. 浏览器截图还确认状态原因显示为字面量 `reason`。复用现有项目 Workloads Item 使用的 StatusReason，保留实际状态、条件提示、正常描述及空值 `-`。
4. 页面成功回调仅关闭弹窗，未主动刷新表格。新增实际页面函数测试确认该缺口，成功后调用现有 DataTable refetch 接口。保留该接口现有清理筛选/勾选的行为；本轮未修改共享 DataTable。

没有新增依赖，没有引入 V3/Wujie 调用，也未修改集群级列表或共享权限计算规则。

## 本地验证

| 实际命令/检查                                                                                   | 结果                                                                                                                |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `./node_modules/.bin/esno packages/shared/src/stores/workload/index.test.ts`                    | 17/17；修复前 13 个用例因 Missing expected rejection 失败                                                           |
| `./node_modules/.bin/esno packages/console/src/pages/projects/containers/workloadScope.test.ts` | 12/12；作用域和 cluster 六项、原因三项、刷新三项分别在修复前失败                                                    |
| `./scripts/test.sh`                                                                             | 72 个文件、246 个测试通过，0 失败                                                                                   |
| `corepack yarn build:packages`                                                                  | 最终版本通过，193.64 秒                                                                                             |
| 变更生产文件 ESLint                                                                             | 0 错误；保留三个项目列表详情链接的既有 max-len 警告                                                                 |
| 变更文件 `prettier --check`                                                                     | 通过                                                                                                                |
| `tsc --noEmit --pretty false -p packages/shared/tsconfig.json`                                  | 共享 Store 修复后通过                                                                                               |
| `tsc --noEmit --pretty false -p packages/console/tsconfig.json`                                 | **失败**：1320 项既有诊断；涉及 Network Policy、跨包 rootDir/文件清单等；本轮三个列表无诊断，最终输出与前次完全一致 |
| Compiler API 读取修改前源码进行类型诊断对照                                                     | 对照一致；该 API 包括声明诊断，共 1329 项，不能与 CLI 的 1320 项混为同一检查口径                                    |
| `git diff --check`                                                                              | 通过；仅作为差异格式检查，不替代上述检查                                                                            |

新增回归执行实际 Store/页面函数和 React Query MutationObserver，在浏览器相关导入及 HTTP 边界使用替代实现；不以源码关键词匹配代替这些行为测试。覆盖 403、500、网络失败、HPA 清理失败、混合批次、等待全部请求、空批次、成功回调、完整作用域、行 cluster、刷新以及正常描述回退。

本地类型诊断基线对照日志 SHA-256：`a851877bf8479e2f2948ed61d9b6632899988cc355e515cbcc0fb659e26ffdd8`。Console 全量类型检查尚未通过，单独登记，不借本次构建和浏览器验收将其抹平。

## 第一版部署和浏览器发现

- CI：[39709275445](https://github.com/mysStack/console/actions/runs/39709275445)，源码 `b08d3421e6d2ddc67874f51f9fd31e07702cddbd`，测试与构建均成功。
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-configmaps-secrets-20261022-100457-b08d3421e6d2`。
- OCI index digest / 实际 Pod imageID：`sha256:b0803cf19d762b9f3fa17762049c4ceb609e5e1361aa9b4d3215bc90d1a28e78`。
- Deployment `kubesphere-system/ks-console` generation/observedGeneration `562/562`；Pod `ks-console-7959b6db48-l8mdq` Running/Ready。
- 重新登录成功，项目列表正常显示目标 namespace 的两个专用 Deployment，但缺少行操作及批量勾选；因此第一版没有通过操作验收，不能用本地测试结果替代。
- 修复前浏览器页面异常基线为 `common is not defined`（两个事件、一个去重类型）；不把它改写为本轮新增错误或已经解决。

## 最终部署与浏览器验证

最终源码 `7961eaedce6626e33b17a2b3399c41ce772e6206` 的 CI：[39711771206](https://github.com/mysStack/console/actions/runs/39711771206)，Unit tests 与 Build and publish 均成功。CI 回读同样为 72 个文件、246 个测试通过。

- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-configmaps-secrets-20261022-103154-7961eaedce66`。
- 按 `tag@digest` 部署的 OCI index digest：`sha256:cd358cb4d3f422d04091133dd7cd6d83e0cf1a290d842b41e7e67ed6780087fa`。
- 平台 manifest：amd64 `sha256:f73018fa5e016db7e483d9c20815c8165f1ede08f2bbee6a205495f2186c8aad`；arm64 `sha256:913726ab4e3e9e2c84a2604a2227960f98aaf2c94b7a9c9d3c47be257c8ae8ab`。不能将平台 manifest 与 OCI index 混用；本集群实际报告的 imageID 为该 index digest。
- Deployment generation/observedGeneration `563/563`，期望与 Ready 均为 1；保留 `maxSurge=0/maxUnavailable=1`。
- Pod `ks-console-7d46dc6d7c-pfvlh` Running/Ready，重启次数 0。实际 imageID：`ghcr.io/mysstack/ks-console@sha256:cd358cb4d3f422d04091133dd7cd6d83e0cf1a290d842b41e7e67ed6780087fa`。
- 第二次部署前保存了第一版镜像及副本/策略；第一次部署前的历史镜像为 `feature-v4-configmaps-secrets-20261021-013709-4b5c7f5670c4`。本轮 rollout 与登录均成功，未触发回滚。

真实浏览器首次脚本因确认按钮仅匹配“确定”、而当前渲染为“确认”而超时。请求记录证明当时没有 DELETE/PATCH，失败分类为测试定位问题；修正多语言匹配后完整重跑。首轮 `results-attempt1.json` 保留，没有把它计作通过。

最终新浏览器登录后执行 24 个检查点，全部通过：

| 场景                                       | Deployment | StatefulSet | DaemonSet | 证据边界                                                                         |
| ------------------------------------------ | ---------- | ----------- | --------- | -------------------------------------------------------------------------------- |
| 原生列表、刷新、详情链接、行菜单和批量勾选 | 通过       | 通过        | 通过      | 检查当前 namespace 的专用样本；详情链接为原生路径，未执行完整详情链路            |
| 单删 403                                   | 通过       | 通过        | 通过      | 浏览器合成错误；真实资源仍存在，错误提示可见，弹窗保留且可重试，无成功提示       |
| 双对象批量删除 500                         | 通过       | 通过        | 通过      | 两个请求均被合成拒绝；两个资源保留，未触发整体成功                               |
| 批量停止网络失败                           | 通过       | 通过        | 不执行    | 浏览器阻断请求，实际 replicas 仍为 1；不模拟 DaemonSet 支持 replicas             |
| 删除取消                                   | 通过       | 通过        | 通过      | 未增加 DELETE 请求                                                               |
| 实际批量入口停止                           | 通过       | 通过        | 不执行    | 单对象样本 PATCH 200，Kubernetes 回读 replicas=0，未手动刷新时列表显示已停止     |
| 实际单删                                   | 通过       | 通过        | 通过      | DELETE 200、Kubernetes NotFound，未手动刷新时行消失；随后刷新仍不存在            |
| 实际批量入口删除                           | 通过       | 通过        | 通过      | 单对象样本 DELETE 200、Kubernetes NotFound，未手动刷新时行消失；随后刷新仍不存在 |

共有 8 个真实成功写请求：两个 PATCH 和六个 DELETE，均返回 200。所有写请求均在 `/clusters/host/apis/apps/v1/namespaces/v4-migration-e2e/` 下。合成 403/500 与网络失败不等于真实低权限权限验证。多对象部分成功、延迟完成和 HPA 清理失败本轮只有单元证据，未宣称有浏览器/API 环境证据。

三个列表导航过程中，对应 V3 Workload 业务请求为 0；这不等于宿主已完全停止加载 V3/Wujie。页面异常去重后仍仅有基线中的 `common is not defined`，没有新增类型，该历史异常尚未修复。已实际查看 Deployment 403、StatefulSet 网络失败和 DaemonSet 500 截图，确认错误提示、保留的弹窗和列表控件渲染。

真实写操作测试结束后，六个专用控制器均不存在；按模板唯一 test-object 标签核对，对应 Pod 也不存在。`v4-migration-e2e` namespace 保留，没有执行整 namespace 清理。

本地证据目录：`output/playwright/workload-actions-20261022/`（生成物保留在本地，未加入 Git）：

- `results.json`：SHA-256 `a186bb4120676ab7f1da85d4bb8da94b4c80fcf88a12c68491fc03acffe03c55`。
- `verify-executed.cjs`：SHA-256 `d2ec085f2a3877e28022a501494869419bab4f6210ac007b3b9c039a21cf24d1`；包含本次实际执行的 Playwright 场景，凭据只来自进程环境。
- `deployment-before.json`、`deployment-before-final.json`、`deployment-after.json`、`image-manifest-final.json`：部署、回滚和制品身份。
- `results-attempt1.json`、各失败场景截图及 RED/GREEN/回归日志：保留失败历史和最终结果。

主要环境命令为 `kubectl --context default -n kubesphere-system set image deployment/ks-console ks-console=<上述 tag@digest>`、`kubectl --context default -n kubesphere-system rollout status deployment/ks-console --timeout=180s`；浏览器命令为 `bash -ic 'set +x; export KS_TEST_USERNAME KS_TEST_PASSWORD; node /tmp/ks-workload-verify.cjs'`。实际执行脚本的副本及哈希见上，报告不记录环境变量的值。

## 测试数据及授权边界

- 集群：`default` context，API Server `https://192.168.2.131:6443`，节点 `dev01`（K3s v1.31.13+k3s1）。
- 测试 namespace：`v4-migration-e2e`，所属 workspace `test-workspace`，Console 集群名 `host`。
- 专用控制器标签：`migration.kubesphere.io/test-run=workload-errors-20261022-100756`；Deployment、StatefulSet、DaemonSet 各两个。Pod 模板使用唯一 test-object 标签和不匹配节点选择器，不启动业务容器、不申请 PVC。
- 对象分别为 `v4-werr-dep-100756-{0,1}`、`v4-werr-sta-100756-{0,1}`、`v4-werr-dae-100756-{0,1}`。只允许对这些对象执行测试变更和清理；namespace 与已有业务数据保留。
- 登录通过 `/home/bruce/.bashrc` 的专用测试环境变量完成，不输出或写入账号密码。
- 浏览器合成的 403/500/网络失败用于验证前端错误反馈；真实成功路径通过 Kubernetes API 回读。合成错误不代表低权限 RBAC 已通过，后台权限策略不作变更。
- 需要登录与 DOM 操作时使用 Playwright；CLI 已完成启动诊断，后续使用 Playwright Node 驱动以直接读取进程中的环境变量，避免 CLI 回显填入的凭据。
- DaemonSet 不执行 replicas 停止成功验证；其批量停止入口的行为等价性仍需核对，不因共享 Store 测试通过而放行。

## 待完成项

1. 原生创建向导、完整动作等价、真实低权限组合、跨 namespace/集群隔离；成功后的筛选/分页体验仍需扩展回归。
2. 共享 Store 的 Job/CronJob 等其他消费者未执行本轮环境浏览器回归；仓库已有回归已全部执行。
3. Console 全量 TypeScript 历史诊断、`common is not defined`；原有全局 P0 风险及已后置的扩展运行时问题。

本轮只接受有实际证据的操作子路径，不自动放行全模块或全量迁移。
