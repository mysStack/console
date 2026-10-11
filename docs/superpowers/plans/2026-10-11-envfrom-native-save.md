# 配置引用统一原生保存 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复普通 env 混合展示、多容器引用隔离及原生整体折叠，并完成真实部署后的完整保存验收。

**Architecture:** 保留完整 V3 制品及字段。Console 引用草稿在公共 `workload.template.edit` action 的最终提交回调中合并到原生提交对象，复用原生 store.update 和取消回调；不提前 PATCH，不访问 Fiber，不拦截全局请求。只读环境页仍由现有容器卡片桥接展示。

**Tech Stack:** 现有 React、TypeScript、Wujie、lodash、node:test、Playwright、GitHub Actions、Kubernetes。

**Spec:** `docs/superpowers/specs/2026-10-10-v3-env-route-display-regression.md`

## Global Constraints

- 131 为部署测试环境，133 仅对照且不修改。
- 写入使用专用合成 Deployment，不修改业务 ams-server 的容器或引用。
- 不替换 V3 制品、不丢弃原生未保存字段，不提交生成物及凭据。
- 本地其他 ConfigMap/Secret 页面工作保持不动，不纳入此修复提交。
- 新容器必须能同一次外层保存中配置引用；安全拦截不是最终验收通过。
- 完整 UI 点击、API 回读和真实 Pod 环境均有证据后才能完成；接口探测不算验收。

### Task 1: 不可变引用草稿合并

**Files:** 新增 `packages/console/src/pages/projects/components/ConfigReference/draft.ts` 与 `draft.test.ts`。

**Interfaces:** `ConfigReferenceDraftChange` 包含 containerName、references、reloaderEnabled 与可选 fileMounts。
`mergeConfigReferenceDrafts(template, changes)` 返回完整原生提交对象的副本，复用现有 buildConfigReferencePatch。

- [x] 补先失败的行为用例：nginx 删除后 envFrom 不恢复，main 引用/手工变量/端口/镜像/探针保留。
- [x] 用 `./node_modules/.bin/esno packages/console/src/pages/projects/components/ConfigReference/draft.test.ts` 观察实际失败。先模块缺失，补仅保留原生对象的基线后实际 5 个断言失败、1 个通过。
- [x] 实现 cloneDeep 后按最终容器名称合并，不以旧容器索引或缺失名称兜底 main；空引用表示删除。
- [x] 补新增容器、顺序变化、源对象不变、Reloader 注解及文件挂载保留的行为用例并运行。6/6 通过；纯合并尚未接入 UI，不算部署验收。
- [x] 精确 stage 本任务文件，中文提交，不加入其他已有工作。代码提交 33c850c6d、827c0619c，其他 ConfigMap/Secret 页面修改未纳入。

### Task 2: 草稿接入完整原生 action

**Files:** 修改 ConfigReference 的 `entry.tsx`、`ConfigReferenceInline.tsx`、`ConfigReferenceSummary.tsx`；按需修改公共 `useV3Actions/index.tsx` 的可选挂载回调。

**Interfaces:** Inline 可接受草稿源与局部确认回调；action 的公开 callback ref 只读取 public props.store.update/onCancel，最终 onOk 将合并对象交给同一原生 store。

- [x] 先为最终提交边界补实际失败用例，再实现 `nativeEdit.ts`：完整提交合并、取消零写入、错误后重试、重复确定、提交中关闭的成功/失败竞态及原生 customMode 清理。7/7 通过，尚未接入产品 UI。
- [x] 补草稿会话取消、重复打开和跨容器切换用例；新增容器即使未打开配置引用也不继承主容器 envFrom，先观察失败再实现。草稿集合 11/11 通过；局部确认改为仅更新会话，不再调用 PATCH。关闭和完整 UI 验证仍待部署验收。
- [x] 原生编辑入口经现有公共 action 打开完整编辑器；五个原有步骤保留，未经校验时外层确定禁用。原生最终提交错误有单元覆盖，真实 UI 失败重试仍待验收。
- [x] 新容器明确名称从空引用开始；实际新增 nginx-new 同次最终提交自己的引用；最终删除容器不重建有纯函数覆盖。
- [x] 原生 action success 后关闭已保存编辑器并刷新数据；失败保留所有草稿供修正；取消不写入。成功、外层取消/关闭与实际激活的容器步骤取消已实测；补充保存前 GET 断网及 PUT 连接失败注入，恢复网络后真实 PUT 200。故障注入不是服务端 4xx/5xx 验收。
- [x] 运行相关用例、`sh scripts/test.sh`、`git diff --check`；精确提交并 push。本地164/164、精确提交CI156/156。

### Task 3: Actions、131 和完整回归

**Files:** 验证记录放 `output/playwright`，不提交截图或 dist。

- [x] 查 exact SHA 的 Action，等待构建完成，确认 Docker Hub/GHCR 两仓镜像身份。38123226541成功，两仓push日志digest一致；独立registry inspect超时不计通过。
- [x] 仅更新 131 ks-console；rollout 与镜像回读成功后开始验收。827c061镜像，ready/updated=1，实际imageID与CI一致。
- [x] Playwright 实际点击：DB=111 与 envFrom 同时显示；两个容器分别整体收起/展开。最终专用Pod三个容器、两份独立引用摘要。
- [x] 专用工作负载新增 nginx，在同一次外层确定中配置自己的引用；刷新、回读确认 main 不变。nginx-new初始0引用，添加WORKER\_前缀后一次PUT保存。
- [x] 删除 nginx 引用、局部确认、原生容器确认、外层确定；刷新、重新打开，旧引用不得恢复。主容器CM+Secret不变，nginx引用为空。
- [x] 同时编辑普通变量及原生端口/其他字段，确认同次保存保留；重复编辑、外层取消或关闭不得写入资源。端口82/DB111与删除引用同次保存；原生内层重置不在本项已通过范围。
- [x] kubectl 回读容器引用、等待真实 Pod rollout，检查合成变量存在性，不输出 Secret 值。首次测试镜像/命令输入错误导致rollout失败；仅修正fixture这三个字段后3/3 Running，分别exec验证隔离。不能把fixture patch当成原生镜像/命令UI验收。
- [ ] 路由刷新/切换/前进后退、中文/英文及 1280/1440/1920 下回归；失败分层记录，不以 CI 替代浏览器。
- [ ] 逐条比对规格与证据；任何未通过项保留目标 active，不宣称全部完成。

## 2026-10-11 接入前审查（历史记录）

- 独立 Agent 的只读审查记录为 `/tmp/ks-draft-boundary-audit-20261011.md`，主 Agent 已读取并核对源代码。
- 原生 action 支持新建完整编辑器的公开 `onOk`/callback ref；没有发现修改已打开旧 Modal 的公开草稿接口。因此接入必须发生在原生 Edit Settings 入口打开之前。
- 提交中关闭已发出的请求不能当作取消成功；现已补测试保证最终成功仅回调 saved，最终失败才清理已关闭会话，不二次关闭 Modal。
- 接入 actions 应用后必须用 `data-wujie-id` 区分 `consolev3` 与 `consoleV3Actions`；当前第一个 `wujie-app` 的选择方式尚未改动，不能据此宣称桥接已完成。
- 原生表单对每个子表单维护独立确认/取消与 updatedTabs；需要验收配置引用草稿在原生容器取消、切换、最终确定中的一致性，不能只验证自定义 onOk 的纯函数。
- 本阶段没有 push、Actions 构建或部署；131 继续保留已验证的旧镜像，完整外层保存失败项仍为未完成。

## 最新部署验收进度

827c061 已部署131，完整保存、删除/新增引用、普通变量混合展示、多容器隔离和原生整体折叠有真实浏览器/API/Pod证据。
完整证据：工作区根目录下的 `output/playwright/2026-10-11-envfrom-131-verification.md`（非仓库制品）。

仍未完成：浏览器Back宿主与V3 Tab不一致；中文截图视觉。
保存失败保留草稿与恢复网络后真实重试、重命名完整保存已补验收。中文 DOM 文案通过，但 headless 截图仍缺少字形，不能算视觉通过；1280/1440/1920 英文全部容器展开测量通过。
因此不得声明整体计划全部通过，也不把 StatefulSet/DaemonSet 或 Reloader 控制器实际滚动算作已验证。

## 原生内部重置层级复核

候选 9dbe4ab 曾误把容器步骤的操作条当成单个容器的表单检查点；其纯函数用例通过不能证明真实交互正确。
131 实测：单容器编辑期间操作条无激活样式，点击它不恢复普通 DB 字段；确认单容器退出后，该操作条才激活。
按正常流程确认单容器 → 点击可见的容器步骤取消 → 重新打开该容器，DB 从草稿 444 恢复到 333，引用恢复 WORKER\_，API resourceVersion 未变、写请求为零。
因此撤回该额外检查点实现及与错误需求假设对应的测试，保留已实现的 cancelContainer/cancelGroup，不改完整 V3。
保留的统一原生保存与三个核心场景不回退；新容器草稿、外层取消和最终单次 PUT 的方案不变。

## 重命名与真实失败重试补验收

- 131 专用 Deployment 中将 nginx-new 改为 nginx-renamed，明确配置自己的 CM/WORKER\_，同时修改 DB=334、添加端口84；实际一次 PUT 200，回读121630677，主容器和 nginx 完整对象均未变。新 Pod 3/3 Running，exec 验证 worker 专属变量及 DB 生效。
- 原生重复端口校验与脚本未等异步退出的问题单独记录，不计为服务端失败重试。保存前 GET 断网后，重命名、DB、引用及前缀草稿仍在，资源版本未变；恢复网络后正常最终保存成功。
- 再次编辑 DB=335，对专用资源 PUT 注入浏览器连接失败（没有模拟成功响应或伪造数据）；实际 requestfailed 为 net::ERR_CONNECTION_FAILED，Modal 保留、资源版本121630727不变。重新打开当前容器可见DB335、同一CM/WORKER\_草稿；移除注入后一次真实 PUT 200，回读121640618，其他容器完整对象仍不变。真实 Pod exec 验证 DB335 与 worker 变量。
- 本轮仅补测试与验收文档，产品代码仍与827c061一致；精确Action38123226541已再次核实success。`sh scripts/test.sh` 本轮34文件164/164通过，日志 `/tmp/ks-envfrom-completion-tests-20261011.log`，CI发布内容仍156/156。
- 浏览器 Back 再次真实失败：host metadata、child env；公共 history/popstate 的手工诊断可以改变子页，但只是定位证据，不是产品修复或验收通过。尚不实施新的盲目路由重试方案。
- 为排除测试机字体问题，仅在本地安装 fonts-noto-cjk；131/133未安装或修改字体。旧浏览器及同会话新页面截图仍为中文方框，中文视觉验收继续保留未通过，不能将 fc-list 成功当成截图成功。

## 后退同步候选：原生宿主事件转发

当前代码只在首次挂载恢复深链；真实Back只有host popstate，child没有事件，sync=false不提供主→子同步。先前依赖React location effect/RAF的候选已撤回，不继续扩大重试器。
本次仅在DeploymentDetail的公共afterMount捕获实际appWindow，注册宿主popstate并按当前工作负载前缀限制目标；使用child replaceState保留历史，不新增宿主记录；卸载时移除监听。不替换V3、不访问React私有状态、不修改全局菜单。
最小路由用例先以无转发实现真实失败（child停在env），接入后4/4通过，本地34文件165/165通过。当前仅为待Action/131真实Back、Forward和核心回归验收的候选，不能据此把Task3打勾。
补充事件语义断言：普通Event没有state，会被V3 browser history视为额外事件而忽略；用例先观察3通过/1失败。复审同时发现旧提交e75fe1bb7记录Wujie appWindow构造器兼容限制，故继续采用已验证的宿主全局PopStateEvent并保留child history.state；测试不向child注入构造器，先观察构造失败再修正。首次误用Node原生TS入口因本机Node未编译TS支持而失败，已按仓库esno入口重跑，不计为产品失败或通过。
