# Deployment 原生容器设置验证记录（2026-10-22）

## 本轮范围

在[原生创建第一批](./deployment-create-131-verify-20261022.md)的基础上，继续补齐多个工作容器、初始化容器、普通环境变量和容器端口。分支为 `feature/v4-configmaps-secrets`，执行方式为单 Codex 会话；既有 Worktree 和历史提交保留，PR #1 保持 Draft。

## REA 与行为依据

- 旧源码参考固定为 `origin/release-3.4` / `175710fefeeba6ff295c2c0967b4d45b83563d26`，只作为不完整旧版本行为输入，不声明其与当前制品一致。
- `src/components/Forms/Workload/ContainerSettings/index.jsx` 的 `handleContainerSave` 将普通容器和初始化容器分别写入 `spec.template.spec.containers`、`initContainers`，要求至少一个工作容器。
- `ContainerForm/Ports/index.jsx` 定义端口名称、容器端口、协议和重复名称校验；`ContainerForm/Environments/index.jsx` 定义每个容器的环境变量编辑入口。V3 的镜像默认端口、Service 联动和配置引用仍保留为后续能力。
- 当前 `v3dist` SHA-256 和 focused REA 收据沿用[创建证据](./deployment-v3-evidence.md)。REA 为 `partial`，本轮没有重新进行全量扫描，也没有把旧源码称为已还原的完整当前源码。

## 实现与缺陷修复

| Git SHA                                    | 内容                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `449bb9db5032bdeadf48e5b7c439f33bf173b771` | 多个工作容器、初始化容器、端口、普通环境变量及校验；修复共享 ArrayInput 的空数组行为 |
| `6689ad88fc59da029068b44eba909b19cc39e3fd` | 修复截图发现的标签布局和端口输入过窄问题                                             |
| `2a2aeb4f4038f53ebe6b847ae10a843fcbcbf235` | 关联两组容器的校验依赖，清除修正字段后残留的旧错误                                   |

普通环境变量保留空字符串及首尾空白；端口只生成 Kubernetes 容器端口，不额外创建 Service。允许省略端口名称，填写时校验长度与格式；端口名称跨整个 Pod 唯一。容器名称跨普通容器和初始化容器唯一，环境变量名称在同一容器内唯一。

共享 ArrayInput 的根因为 `lodash.merge` 按下标合并默认 `['']` 和受控 `[]`，导致空数组仍然渲染一行。两个行为回归先复现失败，再使显式受控数组覆盖默认合并值；未提供 value 时仍保留默认行，已有行的编辑、删除和原生服务端口数据保持。

## 本地检查

| 实际命令                                                                                                                                                                                                                                                         | 结果                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `./node_modules/.bin/esno packages/console/src/pages/projects/components/WorkloadCreateModal/deployment.test.ts`                                                                                                                                                 | 新模型下 RED 7/7 失败；实现后 GREEN 7/7 通过                               |
| `./node_modules/.bin/esno packages/shared/src/components/Inputs/ArrayInput/index.test.ts`                                                                                                                                                                        | RED 2/2 失败；修复后 GREEN 2/2 通过                                        |
| `./scripts/test.sh`                                                                                                                                                                                                                                              | 75 个测试文件，259 项通过，0 失败                                          |
| `corepack yarn eslint packages/console/src/pages/projects/components/WorkloadCreateModal/*.{ts,tsx} packages/shared/src/components/Inputs/ArrayInput/index.{tsx,test.ts}`                                                                                        | 通过；最终 UI 修复另行复跑相关文件                                         |
| `corepack yarn prettier --check packages/console/src/pages/projects/components/WorkloadCreateModal/*.{ts,tsx} packages/shared/src/components/Inputs/ArrayInput/index.{tsx,test.ts} locales/{zh,en,es,tc}/l10n-projects-applicationWorkloads-deployments-list.js` | 通过                                                                       |
| `corepack yarn tsc --noEmit -p packages/shared/tsconfig.json`                                                                                                                                                                                                    | 通过                                                                       |
| `corepack yarn tsc --noEmit -p packages/console/tsconfig.json`                                                                                                                                                                                                   | 失败；仍为 1320 项既有诊断，本轮修改文件无新增诊断，不声明全量类型检查通过 |
| `corepack yarn build:packages`                                                                                                                                                                                                                                   | 通过；共享 ArrayInput 最终修改后重新构建                                   |
| `NODE_OPTIONS=--openssl-legacy-provider corepack yarn build:prod`                                                                                                                                                                                                | 最终 UI 修改后通过；12 项构建警告保留                                      |
| `git diff --check`                                                                                                                                                                                                                                               | 通过                                                                       |

## 构建与部署

第一轮 CI [39724806620](https://github.com/mysStack/console/actions/runs/39724806620) 成功，源码为 `449bb9db5`；对应镜像在 131 generation `566/566` 部署成功，并完成第一轮浏览器验证。截图及浏览器断言随后暴露布局和旧校验提示问题，因此不能使用第一轮功能请求通过替代最终页面验收。

布局中间提交的 CI `39725815638` 因被完整修复制品替代而主动取消，没有部署。最终 CI 为 [39726084825](https://github.com/mysStack/console/actions/runs/39726084825)，源码为 `2a2aeb4f4`。

最终 CI 成功，源码为 `2a2aeb4f4038f53ebe6b847ae10a843fcbcbf235`。镜像 tag 为 `feature-v4-configmaps-secrets-20261022-130717-2a2aeb4f4038`（上海时间），完整部署引用为 `ghcr.io/mysstack/ks-console:feature-v4-configmaps-secrets-20261022-130717-2a2aeb4f4038@sha256:5eb8046de7e04d128d0da178ae648d288f395f31ea2fcb3a4a6e896c883ee9cb`。

部署前核对 context `default`、节点 `dev01` 的 InternalIP `192.168.2.131`、K3s `v1.31.13+k3s1` 和 `kubesphere-system/ks-console`。保存原镜像/副本数/Pod imageID，执行定向 `kubectl set image`、`kubectl rollout status deployment/ks-console` 并回读身份。最终 generation/observedGeneration 为 `567/567`、副本 `1/1` Ready；Pod `ks-console-6d4b6857c5-jxww9` 为 Running/Ready、0 重启，imageID 为 `ghcr.io/mysstack/ks-console@sha256:5eb8046de7e04d128d0da178ae648d288f395f31ea2fcb3a4a6e896c883ee9cb`。部署及登录成功，无需回滚。

## 最终部署后的浏览器与 API 验证

执行 `python3 output/playwright/deployment-containers-20261022/run-visual.py`，通过专用环境变量加载账号，启动全新 Chromium 上下文，从 `/login` 登录。在最终制品上完整复跑，`attempt-6/deployment-create-results.json` 记录 25 个检查点，进程退出码为 0。

| 场景                 | 实际结果                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 列表、创建入口与取消 | 原生页面可访问；namespace 固定；取消不创建对象                                                                                         |
| 页面渲染             | 标签与输入框无重叠，端口输入可读；空数组不生成虚假行                                                                                   |
| 正反校验             | 必须保留工作容器；跨工作/初始化容器重名、同容器重复环境变量、跨 Pod 重复端口名和非法端口名均阻止 POST                                  |
| 纠错与删除行         | 删除最后一个环境变量后保持空数组；纠错后等待表单校验完成，错误提示和错误状态类均清除，截图无残留红边                                   |
| 创建及持久化         | POST `201`；API 回读 2 个工作容器、1 个初始化容器、端口和环境变量一致；POST 中空字符串明确保留，GET 按 Kubernetes 缺省空字符串语义核对 |
| 默认值与缓存         | 标签/选择器、默认 ServiceAccount、镜像策略和 RollingUpdate 默认值正确；创建后无需手动刷新即出现，刷新后仍存在                          |
| 路由                 | V4 原生详情可进入，浏览器返回列表正常                                                                                                  |
| 错误反馈             | 同名对象 POST `409`，弹窗保留并显示创建失败，不假报成功                                                                                |
| 删除                 | UI DELETE `200`，列表缓存同步失效，API 确认对象不存在                                                                                  |
| V3 边界              | 本轮创建及详情未请求 `/consolev3` Deployment 业务入口；不据此声明全局 Wujie 预加载已移除                                               |
| 共享 ArrayInput 回归 | 创建唯一 Service 和 `replicas: 0` 的 StatefulSet，在原生“编辑服务”弹窗核对现有 `http-web:80 → 8080`，取消后 Service spec 不变          |

截图复核发现前一轮截图截取在异步校验更新完成前。最终用例增加等待 `.form-item-status-error` 为 0，再读取输入边框样式并截图；确认是截图时机问题，没有额外修改业务代码。最终截图为 `attempt-6/deployment-create-filled-before-submit.png`、`deployment-create-list-after-submit.png`、`deployment-create-native-detail.png`、`deployment-create-duplicate-error.png`、`shared-service-ports-regression.png`。

本轮唯一命名的 Deployment、StatefulSet、Service 已清理，回读无 `v4-containers-` 前缀残留，`v4-migration-e2e` 保留。页面异常仍仅有既有 `common is not defined`，另有既有扩展初始化错误与 watch WebSocket `403`，未观察到新增页面异常类型；这些未关闭项不写成已通过。

可复现证据保存在 `output/playwright/deployment-containers-20261022/`，未加入 Git：

- 最终脚本 `deployment-containers-visual-e2e.cjs` SHA-256：`2081d84b2127555f8cfc8c4265ae810ff5ffa362e07646dd821a9452cb4d2103`。
- 最终结果 `attempt-6/deployment-create-results.json` SHA-256：`4d523d859b3f0e2605eca24bdda94080c8a36cb8602697bb47d00b8d1dd55085`。
- CI/部署身份：`ci-final.json`、`deployment-final-before.json`、`deployment-final-after.json`。
- 本地日志：`/tmp/ks-deployment-containers-tests-latest.log`、`/tmp/ks-deployment-containers-tsc-latest.log`、`/tmp/ks-deployment-containers-build-final.log`、`/tmp/ks-deployment-containers-prod-latest.log`。

## 首轮浏览器发现

1. Kubernetes API 回读会省略空字符串 `EnvVar.value`。测试先核对 POST 请求确实携带空字符串，再按缺省空字符串语义比较 API 回读；不修改业务值来迎合测试。
2. 多容器请求成功并不等于页面渲染合格。截图发现标签换行混排及端口输入过窄，新增浏览器布局断言并观察到 RED 后修复。
3. 工作容器与初始化容器共用全组校验，但未声明关联字段依赖，导致其他组修正后当前组残留旧错误。浏览器重复触发并观察 RED 后增加相互依赖。

原始脚本、每轮失败和成功结果、截图及部署身份保存在本地 `output/playwright/deployment-containers-20261022/`；每轮分目录保留，不覆盖既有验收产物。不保存登录凭据、Token 或 Secret 明文。

## 模块边界

本批测试 Deployment 使用 `replicas: 0`，验证创建表单、API 对象、缓存、路由和错误反馈；不以此声明镜像拉取、初始化容器实际执行和业务 Pod Ready 已验证。Console Deployment 的 rollout/Pod Ready 单独核对。

Deployment 继续为“开发中，VERIFY 部分通过”。后续仍须补齐容器命令/参数、配置引用、探针、资源、存储、镜像凭据、调度、安全上下文和完整高级设置；创建 RBAC 正反矩阵、跨项目/namespace 切换、工作负载运行和完整功能等价尚未全部关闭。既有扩展运行时错误按负责人决定后置，watch WebSocket `403` 持续跟踪。
