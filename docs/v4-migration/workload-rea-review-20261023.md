# Workload 组合批次 REA 复核结论

## 1. 复核范围

- 模块：`workloads`
- 能力批次：`deployment-statefulset-daemonset`
- 资源：Deployment、StatefulSet、DaemonSet
- 分支：`feature/v4-workloads`
- 当前复核提交：`09725c83a811b474e471f8788b803a3a02637339`
- 当前阶段：`REA`
- REA 状态：`分析中，待负责人复核`
- V3 参考源码树：`origin/release-3.4` / `1e499d92e11374e26c76f5e13be45251602bd596`
- 当前 `v3dist` 绑定源提交：`e67b95ccdfd0b0b98d3e83de393fbfbcd4e172a0`

本次是对已有 REA 材料的内容复核和边界校准，不是负责人签署。`module-execution.json` 的 `rea.review` 继续保持 `null`，不能据此进入 DEV、构建或部署。

## 2. 复核结论

### 总结

**REA 不通过，暂不放行 DEV。**

已有材料已经完成当前制品定位、旧 V3 设置分区快照、更新策略请求形态、普通项目详情入口以及部分 Store/API 静态矩阵。它们证明了开发方向和资源差异，但没有证明三类资源的完整行为等价，也没有证明当前 V4 运行时已经脱离 V3/Wujie。

| 项目                           | 当前结论                           | 证据边界                                                                                                                                     |
| ------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 入口与页面分区                 | 部分确认                           | 旧 V3 页面分区和当前普通项目详情入口已定位；集群级主列表仍由 V4 外壳挂载 Wujie 内的 V3 列表                                                  |
| 字段、默认值、校验和写入语义   | 未闭环                             | 已知主要分区和若干更新策略字段，完整字段级默认值、校验、清空/保留和三类资源差异还没有可执行矩阵                                              |
| Action、API、Store、缓存和错误 | 未闭环                             | 静态调用链和部分请求形态已确认；完整成功、拒绝、取消、冲突、缓存失效和资源差异仍缺运行时对照                                                 |
| RBAC 与作用域                  | 未闭环                             | 项目级 URL 和部分请求边界已定位；三类资源的正反权限、集群/项目作用域和跨 namespace 隔离未完成当前制品闭环                                    |
| 配置引用                       | 已确认 V3/Wujie 依赖，属于开发缺口 | `useV3action`、`consolev3`/`consoleV3Actions` Shadow DOM 和 `workload.template.edit` 仍在当前代码路径中；原生 Patch 逻辑不能替代入口生命周期 |
| 当前 V4 原生替代               | 未满足                             | StatefulSet/DaemonSet 编辑设置仍调用 YAML；集群级三类 Workload 列表仍使用 Wujie/V3                                                           |

## 3. 已确认的关键事实

### 3.1 配置引用不是未知项，而是明确的 V3 桥接缺口

当前项目级三类 Workload 共用 `ConfigReference` 入口：

| 当前文件和位置                                                                          | 事实                                                                                                | 对 DEV 的要求                                                         |
| --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `packages/console/src/pages/projects/components/ConfigReference/entry.tsx:1-7,29-32`    | 入口直接导入 `useV3action` 和 `wujie` 相关桥接能力                                                  | 设计并实现不依赖 V3 Action 总线的原生入口                             |
| `entry.tsx:99-131,247-269`                                                              | 通过 `wujie-app` Shadow DOM、`consolev3`/`consoleV3Actions` 窗口和 `data-test` 锚点注入配置引用入口 | 原生页面必须拥有稳定的 React 挂载点，不得依赖 V3 DOM 结构             |
| `entry.tsx:379-414`                                                                     | 读取原生 Workload API 后调用 `actions.open({ action: 'workload.template.edit', ... })`              | 原生编辑器必须直接管理容器配置引用草稿、保存和错误反馈                |
| `packages/console/src/pages/projects/components/ConfigReference/bridge.ts:30-45,97-107` | 点击拦截和挂载父节点依赖 V3 DOM 选择器和 Action 行结构                                              | 新实现需要独立的组件事件和路由边界                                    |
| `packages/console/src/pages/projects/components/ConfigReference/nativeEdit.ts:40-67`    | 当前回调借用 V3 原生编辑器实例的 `store.update` 和 `onCancel`                                       | 新实现需要直接使用 V4 Store/API，并单测保存、取消、失败和资源版本冲突 |

`nativeEdit.ts` 的 Patch 合并和 `ConfigReferenceInline` 的展示逻辑可以作为迁移输入，但当前测试只能证明桥接在 V3 DOM 存在时工作，不能证明 V3/Wujie 已移除。

### 3.2 集群级列表仍是当前 Workload 的 V3 运行时入口

| 当前文件和位置                                                                            | 事实                                                                     | 影响                                                     |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- |
| `packages/console/src/pages/clusters/containers/ApplicationWorkloads/routes.tsx:37-49`    | 三个资源路由都挂载 `WorkLoadList`                                        | 入口外壳是 V4，但不能据此推出列表是原生实现              |
| `packages/console/src/pages/clusters/containers/Workload/Workloads/index.tsx:20-37`       | 三个 Tab 都渲染 `./Embed`                                                | 具体列表实现需继续沿用同一处主入口核验                   |
| `packages/console/src/pages/clusters/containers/Workload/Workloads/Embed/index.tsx:10-16` | 按资源 Tab 生成 `/consolev3/clusters/:cluster/<tab>` 并渲染 `WujieReact` | 集群级 Deployment、StatefulSet、DaemonSet 列表尚未原生化 |

独立候选 Embed 文件的 URL 互换属于未挂载文件的静态风险，不能写成主入口已经复现的路由错误；但主入口的 Wujie/V3 依赖是真实的当前代码事实，必须纳入 DEV 范围。

### 3.3 普通项目详情仍存在资源差异

- Deployment 的设置入口已经有原生设置路径输入，但完整字段和三类资源等价性未完成。
- StatefulSet 和 DaemonSet 当前 `editConfigTemplate` 仍调用 `editYaml(detail)`，与旧 V3 的设置入口行为不等价。
- 当前 Workload Store 的停止操作对三类资源统一写入 `spec.replicas=0`；DaemonSet 没有 Deployment 的 replicas 语义，必须在 DEV 前明确拆分并补回归。
- StatefulSet 的 `serviceName`、`volumeClaimTemplates`，DaemonSet 的节点调度和更新策略，不能由 Deployment 的公共表单或验收结果代替。

## 4. 高风险项复核状态

| ID    | 复核后状态       | 不能关闭的原因                                                                                  | 进入 DEV 前的关闭条件                                                                                |
| ----- | ---------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| WL-01 | 部分关闭         | 普通入口和旧页面分区已定位，但集群级列表仍是 V3/Wujie，StatefulSet/DaemonSet 原生设置入口未实现 | 三类资源的项目/集群入口、详情 Tab、编辑设置分区和路由替代矩阵逐项绑定当前代码与运行时证据            |
| WL-02 | 未关闭           | 仅有分区和部分策略字段，缺少完整默认值、校验、清空/保留和写入语义                               | 为三类资源建立字段级表，区分公共字段和资源特有字段，并用 V3 页面/Network/API 证据标注已验证或未知    |
| WL-03 | 未关闭           | 静态 Store/API 不能替代完整 RBAC、错误、取消、冲突、缓存和作用域运行时证据                      | 完成三类资源 Action/API/Store/RBAC/作用域/缓存/错误矩阵，并补足必要的非破坏性运行时证据              |
| WL-04 | 已确认的实现缺口 | 配置引用仍依赖 V3 Action、Wujie Shadow DOM 和 V3 编辑器实例；这不是可以豁免的未知项             | 原生配置引用入口、Patch/API、保存/取消/失败/冲突路径和三类资源浏览器验证完成后，才能从高风险清单移出 |

## 5. 门禁动作

本次复核不改变阶段记录：

1. `phase` 保持 `REA`，`rea.status` 保持 `分析中`，`rea.review` 保持 `null`。
2. 不进入 DEV，不修改业务功能代码，不构建镜像，不部署 131。
3. 后续开发前必须先完成以上高风险项的证据闭环，并由指定负责人以可追溯材料完成独立复核；当前 Codex 会话不能代替该签署。
4. 旧 V3 源码、旧镜像和既有浏览器结果继续作为输入或历史证据，不能直接继承为当前 SHA 的模块通过。

## 6. 可复现的复核命令

```bash
git status --short --branch
git show --stat --oneline 09725c83a811b474e471f8788b803a3a02637339
rg -n 'useV3action|wujie|consolev3|consoleV3Actions|workload.template.edit' \
  packages/console/src/pages/projects/components/ConfigReference \
  packages/console/src/pages/clusters/containers/Workload/Workloads
python3 /home/bruce/code/ks-develop/scripts/v4-module-gate.py workloads start --phase REA
```

最后一条命令只证明当前分支、阶段和记录结构满足 REA 取证通道；它不代表 REA 内容通过。
