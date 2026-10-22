# Workload 编辑设置 REA 复核记录（2026-10-22）

## 结论

本记录纠正此前把“原生表单可操作”当成“V3 编辑设置已完成等价迁移”的判断。

当前 `feature/v4-workloads` 中的 `WorkloadSettingsModal` 是 V4 原生 React 表单，运行时不再通过 V3 iframe/Wujie 打开；但该实现形成时，编辑设置的 V3 行为、完整字段、动态 Action、请求 payload、作用域、RBAC、校验和错误路径尚未由 REA 逐项闭环。因此它只能作为尚未验收的阶段性实现，不能标记为完成，也不能作为完整 V3 等价实现。

当前能力状态：`REA / 分析中`，以 [module-execution.json](./module-execution.json) 为唯一当前记录；[REA 索引](./rea-analysis-summary.md)和[分区/字段能力清单](./deployment-settings-capability-matrix.md)提供对应说明。现有 DEV/VERIFY 输入不得据此关闭编辑设置缺口。

REA 的 `partial/no-match` 不要求重做整个模块或恢复所有原始源码；须逐项判断它对当前能力的影响，用 Bundle 定位、合法旧源码参考和真实 V3 运行时证据互相校准后即可推进。

## 分析对象和证据

| 项目                | 内容                                                                                                                                                  |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 当前分支            | `feature/v4-workloads`                                                                                                                                |
| 分析输入 HEAD       | `36ae2216167ae27561c05e37e5157df0da322de8`                                                                                                            |
| 旧制品目录          | `packages/bootstrap/assets/v3dist`                                                                                                                    |
| 重点 V3 bundle      | `8.efefc7072f02199ebc47.js`，SHA-256 `4dee3cff0872f24fe4405b76df383e723272bb67af8419988e4fdd91e11daea5`                                               |
| 重点字面量          | `EDIT_SETTINGS`、`editConfigTemplate`                                                                                                                 |
| 完整目录 REA        | `ev_9f14c3f7bf67e0b64a28558bbc7f3286f77449819b8880649b66fa82886108dc`，根制品摘要 `0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4`  |
| 三个相关 bundle REA | `ev_a61e9744aac5b0574203a4086e357b7df8379447286909268e0561ea93228439`，根摘要 `921dfb31b4cb63737aa34cb4dd128c854225f048136f152ef240dae2df5766d8`      |
| 单 bundle 定向 REA  | `ev_d3a9f47a248d36f92a2463a9313e1f9a12b169698cb243779137416db93d8ab8`；摘要投影 `ev_415c0c658568c61f2cc928162b8433abe9a831da946d3408ade0045370ad00a4` |
| 定向模块页          | `ev_7a0cffb5d2584ef0aa5f558d376ea66c321f0f0c53a07c35d49face24427e15c`                                                                                 |

## REA 实际结果

1. REA 识别到相关 bundle 和 `EDIT_SETTINGS`/`editConfigTemplate` 候选，但没有形成可直接用于完整重构的闭合行为链。
2. 完整目录分析存在未选取文件、主 bundle 资源限制、动态属性解析和运行时执行未知项；分析结果明确为 `partial`，不能把未知解释为“没有功能”。
3. 单 bundle 定向分析仍存在 1 个 application unknown、12 个 semantic unknown，语义图为 `partial/truncated`。REA 未执行 bundle bootstrap 或真实 UI，因此它不能单独证明菜单可见性、Action 参数、请求结果、权限和错误反馈。
4. 对定向分析执行 `EDIT_SETTINGS` 精确追踪得到 `ev_3acad7360b5bbe8ebb8390ba9f718bfadd4fabc9e8b4360ed01b9985ab635216`，结果为 `no-match`。REA 明确规定 `no-match` 不能解释为功能不存在；它只说明当前静态图没有恢复出可用的精确行为路径，因此不能据此生成实现结论。
5. 所有静态候选都需要与运行时网络、浏览器页面和 Kubernetes API 证据对齐。当前已有浏览器测试只覆盖部分原生 V4 表单场景，不能替代 V3 行为矩阵。

## 当前实现与已证明范围

当前 `WorkloadSettingsModal` 具备以下阶段性实现：

- 基础名称、namespace、replicas；
- 普通容器和初始化容器；
- 镜像、端口、命令、参数、普通环境变量、ConfigMap/Secret envFrom；
- HTTP/TCP/command 探针；
- CPU/内存 requests/limits；
- 部分卷类型、卷挂载和字段保留；
- 表单校验、resourceVersion 冲突和网络错误提示。

这些内容只能证明已实现的当前 V4 代码行为。尚未证明的内容至少包括：

- V3 编辑设置的完整字段集合和默认值；
- 调度、亲和性、污点容忍、优先级、ServiceAccount、镜像拉取凭据、安全上下文、生命周期、DNS/主机别名等高级 Pod/容器设置；
- Deployment 更新策略和滚动策略的完整编辑行为；
- 所有配置引用、Secret 脱敏、PVC 及特殊卷组合；
- 动态 Action 的入口可见性、参数、资源作用域和禁用条件；
- 管理员、项目成员、低权限账号和联邦托管资源的 RBAC 差异；
- V3 成功、校验失败、API 失败、取消、冲突、资源不存在和网络失败的逐项等价关系；
- 浏览器直达、刷新、返回、namespace 切换后的全部缓存和路由行为。

字段保留逻辑不能替代可编辑能力证明。把未知字段原样带回请求，只能减少数据丢失风险，不能说明用户可以按 V3 行为正确查看、修改和校验这些字段。

## 正确的后续门禁

编辑设置必须先形成以下矩阵，才能继续扩大开发和 VERIFY：

| 维度    | 每项必须记录                                       | 当前状态                   |
| ------- | -------------------------------------------------- | -------------------------- |
| 入口    | V3 菜单、路由、显示条件、资源类型                  | 未闭环                     |
| Action  | Action 名称、参数、调用前置条件、成功/失败反馈     | 未闭环                     |
| API     | 方法、URL、请求体、resourceVersion、响应和错误映射 | 部分已有，未与 V3 逐项对齐 |
| 字段    | 字段路径、类型、默认值、可编辑性、保留规则         | 部分已有，未完成           |
| 校验    | 前端、API、跨字段和资源引用校验                    | 部分已有，未完成           |
| 作用域  | cluster、workspace、project、namespace、联邦资源   | 未闭环                     |
| RBAC    | 正向、拒绝、隐藏/禁用和错误反馈                    | 未闭环                     |
| V4 替代 | 对应原生页面、Store、Mutation、组件和路由          | 部分已有                   |
| 运行时  | 浏览器、网络、Kubernetes API 和部署制品证据        | 部分已有                   |

在该矩阵闭环前，`deployment-settings-verify-20261022.md` 中的浏览器记录只能作为部分运行时证据，不能作为“编辑设置已验收”的依据。下一阶段应先完成 REA 证据包和差异矩阵，再针对缺口调整原生实现；不以继续增加测试数量替代行为逆向。
