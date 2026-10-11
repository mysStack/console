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
- [ ] 原生 action success 后关闭已保存编辑器并刷新数据；失败保留所有草稿供修正；取消不写入。成功、外层取消/关闭与容器步骤取消已实测；原生第一层重置/取消及真实错误重试仍待细分核验。
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

仍未完成：浏览器Back宿主与V3 Tab不一致；原生内层重置/取消细分语义；真实失败重试；重命名场景。
中文 DOM 文案通过，但 headless 缺少 CJK 字体，中文截图视觉不计通过；1280/1440/1920 英文全部容器展开测量通过。
因此不得声明整体计划全部通过，也不把 StatefulSet/DaemonSet 或 Reloader 控制器实际滚动算作已验证。

## 原生内层重置修复（待新镜像验收）

真实 DOM 和原始制品确认：第一层 confirm-cancel 重置到原生最后一次表单检查点，容器编辑仍保持打开；第二层才退出容器。
新增引用草稿的表单检查点，按公开 DOM 的嵌套确认结构区分两层，不依赖散列类名或 React 私有状态。
第一层确定只在原生验证成功、操作条移除激活样式后接受引用检查点；第一层取消恢复该检查点，不提前请求 API。
新增两个用例先失败、实现后通过；本地完整集合 166/166 通过，日志 /tmp/ks-envfrom-reset-tests-20261011.log。
新实现尚未部署验收，不将该项勾为完成。
