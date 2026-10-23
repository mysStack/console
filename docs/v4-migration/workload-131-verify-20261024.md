# Workload 131 专项 VERIFY（2026-10-24）

## 当前增量部署与登录阻塞（02:29 上海时间）

本节是当前状态，以下 `ef3b4f1a8` 专项成功结果保留其历史制品边界，不能直接继承给新代码。

- DEV 源提交 `3e1d40eae023cf54905e9c298f1ddd387ab2a98a`；构建提交 `3d255eaf85065d3e156dd7f6b8551e9557b6bcbc`。
- [CI Run 40000821377](https://github.com/mysStack/console/actions/runs/40000821377) 已成功，检出 SHA 一致；单元测试 89 文件、400 项通过，镜像构建/推送成功。本地 `build:packages`、`build:locales`、定向 ESLint/Prettier、`git diff --check` 通过；全项目 TypeScript 仍有 1326 条诊断，不记为通过。
- 测试镜像 `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261024-020955-3d255eaf8506`；index digest `sha256:d196181c25f1519f29ccc56b640c914c3b692440bbb0917a43636db925894ce4`。amd64 manifest `sha256:41a78f55cf1bc50afe3132c35c49b416ddcdc1e9b3be7c4a8737b53fed814e60`，两种身份分别记录，不混用。
- 部署门禁通过后实际更新 131 `kubesphere-system/ks-console`，rollout 成功；Pod `ks-console-585485888-wttmv` Running/Ready，实际 imageID 后缀与上述 index digest 一致。
- 浏览器使用零初始 Cookie 的新 context。首次登录脚本误用 `input[type=text]`，而页面用户名输入没有该属性，填写阶段超时；按授权要求立即恢复部署前镜像。此处是测试脚本失败，不能声称新镜像发生登录回归。
- 修正实际 placeholder 选择器及沙箱中不可用的 `URL` 构造调用后，使用 `/home/bruce/.bashrc` 的专用账号在**已回滚旧镜像**登录：HTTP 200，但 JSON `success=false`、业务状态 400、`INCORRECT_USERNAME_OR_PASSWORD`；Console 后端日志匹配 `invalid_grant`。不能只凭 HTTP 200 认定登录通过。停止重复尝试，不输出账号、密码、Cookie 或原始登录响应。
- 回滚后再次 `rollout status --timeout=30s` 成功，副本 1/1；当前 Pod `ks-console-98567fbfb-sr997` Running/Ready，实际 imageID `ghcr.io/mysstack/ks-console@sha256:d78e6edd76bd691345af0c10e865b1f1d97fabcdf4948e521b12ee50603be9c3`，登录页 HTTP 200。**认证登录恢复未验证通过**，当前运行的是旧 `ef3b4f1a8` 镜像。
- 当前未执行：新镜像三类设置渲染/保存/取消、镜像搜索正向、环境引用、权限修复、完整 namespace/RBAC 与其他等价性复验。已请求负责人在本机核对专用测试凭据；有效登录恢复后，重跑部署门禁、重新部署同一构建制品并从新 context 验收。尚无证据需要因本次认证拒绝修改 Workload 业务代码。

结构化证据：[当前构建/部署/回滚](./evidence/workload-settings-verify-attempt-20261024.json)。未修改三类 fixture、未清理既有生成物、未合并 PR #2，阶段保持 `VERIFY / 未完成`。

## 制品身份和范围

- Git SHA：`ef3b4f1a83c3b708f5a12b35dd178bf358c99b8d`；DEV 源提交 `f6b7c689b55b1561d474dcb6dc056a39e2166e51`。
- CI Run：[39941312750](https://github.com/mysStack/console/actions/runs/39941312750)，结论 success，检出 SHA 一致。
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-workloads-20261023-184640-ef3b4f1a83c3`。
- digest / 实际 Pod imageID 后缀：`sha256:d78e6edd76bd691345af0c10e865b1f1d97fabcdf4948e521b12ee50603be9c3`。
- 131 `kubesphere-system/ks-console` 副本 1/1，Pod `ks-console-98567fbfb-f9qkb` Running/Ready。
- 专用 namespace `v4-migration-e2e`；未删除 namespace，未修改业务数据。

## 实际浏览器专项结果

| 场景           | Deployment   | StatefulSet        | DaemonSet          | 证据边界                                                                                            |
| -------------- | ------------ | ------------------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| 原生编辑设置   | 通过         | 通过               | 通过               | 优雅终止 30→31、PUT 200、API 回读、刷新回填、修改后取消不保存、恢复 30；镜像/引用/节点选择/PVC 保留 |
| ConfigMap 引用 | 通过         | 通过               | 通过               | 前缀保存 PATCH 200、刷新回填、取消不保存、恢复初值                                                  |
| Secret 引用    | 通过引用共存 | 未独立验证         | 未独立验证         | 不输出 Secret 值，不扩大为三类全覆盖                                                                |
| 保存失败       | 通过受控失败 | 通过受控失败       | 通过受控失败       | Playwright 拦截 PATCH 返回 500，提示可见、API 未改变；不是实际 API Server 故障                      |
| PVC 本地化     | 不适用       | 通过               | 不适用             | 创建区标题、添加按钮和非法输入校验显示中文，不显示原始键                                            |
| 低权限引用页   | 发现缺陷     | 同一共享面板待复验 | 同一共享面板待复验 | Deployment 实际登录后仍可编辑；点击应用实际 PATCH 403，服务端未改变                                 |

可重跑脚本：[设置持久化](./evidence/workload-settings-browser-20261024.js.txt)、[引用持久化](./evidence/workload-config-reference-browser-20261024.js.txt)。脚本仅针对登记 fixture，应先核对资源身份和当前制品再运行。所用资源：`v4-deploy-edit-ef3`、`v4-pvc-sts-7fa`、`v4-stop-ds-7fa`，引用 `v4-cfg-ref-ef3` / `v4-sec-ref-ef3`。

低权限实测时间 `2026-10-23T16:17:49.924Z`（上海 2026-10-24 00:17），账号为已有专用 viewer；未新增权限。其 Deployment PATCH 为 403，GET 为 200，操作前后 resourceVersion 均为 `135946818`，envFrom 仅含以上两个引用名称且未改变，页面显示“配置引用保存失败。”。

## 缺陷处理与剩余条件

根因：`ConfigReferencePanel.tsx` 没有调用项目/namespace 范围的 `hasPermission`，编辑控件和保存回调缺少 edit 权限判断；详情主操作已正常按权限过滤。修复只作用于普通三类 Workload 引用面板，保留容器切换、只读预览和返回，不改变全局鉴权工具或其他模块。

模块退回 DEV，REA 批准保留；先补组件权限回归，修复后再进入 VERIFY，构建新 SHA 镜像并重新部署浏览器验证。此记录不表示三个模块已验收：完整 RBAC、跨 namespace 正反隔离、所有高级字段和 Action 逐项等价仍需完成。全局遗留扩展初始化错误独立跟踪；不将受控 500 及旧镜像证据充当当前全部成功。

## 负责人指出编辑设置版本/能力不符后的纠偏

本轮确认：131 已部署制品与 ef3b4f1a8 一致；这只能排除本次部署 SHA 不一致，不能证明编辑设置符合当前 V3 行为。之前只验证优雅终止字段保存/回填，却没有把完整编辑界面与当前 V3 逐项比较，遗漏了实际能力差异。

2026-10-24 上海时间约 00:22，在同一 131、同一专用 Deployment `v4-deploy-edit-ef3` 上只读打开 `/consolev3/clusters/host/projects/v4-migration-e2e/deployments/v4-deploy-edit-ef3/resource-status` 的编辑设置，实际观察：

- 左侧独立分区为更新策略、容器、存储、容器组调度规则、容器组优雅终止；容器通过卡片进入二级编辑。
- 容器编辑页提供 Docker Hub/私有镜像服务提示、容器类型、CPU/内存预留及上限、GPU 类型（NVIDIA GPU）与 GPU 上限、应用层端口协议、环境变量类型等。
- 原生 `WorkloadSettingsModal` 为单页长表单；`ContainerInput` 镜像为普通文本输入，资源只编辑 CPU/内存四项，端口仅 TCP/UDP/SCTP，环境变量仅名称/文本值与 envFrom。不能把未编辑字段保留当作这些交互已迁移。
- V3 页面存在 `input[name="gpu.value"]`，当前原生表单不存在对应 GPU 编辑控件；当前 v3dist 的 `1.9ca3a76d71946712055c.js` 也含 GPU 选择和 imagePullSecrets 处理。此处是当前制品/真实页面差异，不是依靠 release-3.4 推断。

尚不能给出当前制品对应的完整原始源码版本号，也不能把所有差异统一归因于某个旧版本。旧 `release-3.4` 仅作参考；应以当前固定 v3dist tree `1e499d92e11374e26c76f5e13be45251602bd596` 和真实 V3 设置页为准。

优先级调整：先按 DS-01（界面分区）、DS-04（镜像选择/认证）、DS-07（环境引用）、DS-09（资源/设备）、端口协议补齐当前制品对照与原生缺口，再继续全面验收。配置引用 RBAC 作为已确认缺陷保留，不取代完整设置等价主线。本次没有提交 V3 保存请求、没有修改业务功能代码、没有部署新镜像；此前专项成功结论仅限所列场景。
