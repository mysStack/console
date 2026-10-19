# P0-Audit V3 Action 桥接库存

> 取证日期：2026-10-17（上海时间）
> 分支：`feature/v4-p0-audit`
> 基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`
> 目的：记录当前 V4 到 V3 的动态 Action 桥接和旧 V3 Action 规模，不把静态调用当作运行时行为证明。

## 1. 当前 V4 桥接协议

`packages/console/src/actions/v3actions.tsx` 和 `packages/shared/src/hooks/useV3Actions/index.tsx` 都通过 `WujieReact.bus.$emit('triggerAction', action, params)` 向名为 `consolev3` 或 `consoleV3Actions` 的 Wujie 实例发送 Action：

- 默认 Action 为 `workload.template.edit`；
- 发送前通过延迟等待 Wujie 实例挂载；
- `render` 会挂载隐藏的 Wujie 实例，URL 分别为 `/consolev3/` 或 `/consolev3/dashboard`；
- shared Hook 要求调用方提供 `v3Module` 和 `v3StoreParams`，并允许覆盖 Action 名称；
- `v3actions.tsx` 版本允许直接传入 `action` 和任意参数。

这说明 V3 Action 的契约由字符串 Action 名、模块名、Store 参数和 Wujie 实例生命周期共同组成。删除 `useV3action` 前必须建立每个调用点的替代 V4 操作和权限行为。

## 2. 当前调用点库存

排除测试文件后，`useV3action` 出现在 14 个源码文件中，其中 11 个是实际业务调用文件，3 个是桥接实现或导出文件：

```text
packages/console/src/pages/projects/components/ConfigReference/entry.tsx
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/index.tsx
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/index.tsx
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/index.tsx
packages/console/src/pages/projects/containers/Applications/AppTypeTable/OPAppTable/index.tsx
packages/console/src/pages/workspaces/containers/Devops/index.tsx
packages/core/src/components/Layouts/Header/ProfileMenu/index.tsx
packages/shared/src/components/Apps/AppCreate/index.tsx
packages/shared/src/components/Apps/Applications/AppTypeTable/OPAppTable/EdgeWorkloads/index.tsx
packages/shared/src/components/Apps/AppsDeploySpaceModal/index.tsx
packages/shared/src/components/Modals/AppTemplateEdit/index.tsx
packages/shared/src/hooks/useV3Actions/index.tsx
packages/console/src/actions/v3actions.tsx
packages/shared/src/hooks/index.ts
```

其中 `hooks/index.ts` 是导出文件，`actions/v3actions.tsx` 是桥接实现，`hooks/useV3Actions/index.tsx` 是共享 Hook 实现，三者不应按业务调用点重复计数。实际业务调用集中在工作负载详情、配置引用、应用创建/部署、DevOps、用户通知设置和边缘工作负载路径。

### 2.1 业务调用点与参数映射

以下结果由当前 V4 源码逐个读取 `open({ ... })` 调用得到。没有运行页面，因此“触发入口、Network、权限结果和错误态”仍属于待运行时验证项。

| 当前文件与位置                                                                                        | Action                                         | `v3Module` / `v3StoreParams`                              | 作用域和回调事实                                                                               |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/console/src/pages/projects/components/ConfigReference/entry.tsx:404`                        | `workload.template.edit`                       | `workload` / `module`                                     | `cluster`、`namespace`、`name`、`detail`、`supportGpuSelect`；原生配置引用保存成功后刷新并通知 |
| `.../Workloads/DaemonSets/Detail/index.tsx:242`                                                       | 未显式传入，Hook 默认 `workload.template.edit` | `workload` / `module`                                     | 继承 `module`、路由参数和 `detail`；`hasRootStore: true`；成功后通知并 `refetch`               |
| `.../Workloads/Deployments/Detail/index.tsx:282`                                                      | 未显式传入，Hook 默认 `workload.template.edit` | `workload` / `module`                                     | 继承 `module`、路由参数和 `detail`；`hasRootStore: true`；成功后通知并 `refetch`               |
| `.../Workloads/StatefulSets/Detail/index.tsx:280`                                                     | 未显式传入，Hook 默认 `workload.template.edit` | `workload` / `module`                                     | 继承 `module`、路由参数和 `detail`；`hasRootStore: true`；成功后通知并 `refetch`               |
| `.../Applications/AppTypeTable/OPAppTable/index.tsx:323`                                              | `batch.deploy.app.create.v2`                   | `edgeTemplateStore` / `{ module: 'edgeappsets', detail }` | 边缘应用模板创建；成功后通知并刷新表格                                                         |
| `packages/console/src/pages/workspaces/containers/Devops/index.tsx:86`                                | `devops.edit`                                  | `devopsStore` / `{}`                                      | `cluster`、`workspace`、`detail`；成功后刷新列表                                               |
| `packages/console/src/pages/workspaces/containers/Devops/index.tsx:158`                               | `devops.create`                                | `devopsStore` / `{}`                                      | `cluster`、`workspace`；成功回调接收 cluster 并刷新列表                                        |
| `packages/core/src/components/Layouts/Header/ProfileMenu/index.tsx:89`                                | `notification.user.setting`                    | `userStore` / `{}`                                        | 全局用户通知设置；当前调用没有资源作用域参数                                                   |
| `packages/shared/src/components/Apps/AppCreate/index.tsx:54`                                          | `app.template.create.v2`                       | `edgeStore` / `{ module: 'edgeappsets' }`                 | 传入 workspace、edge cluster、appName、`module: 'apptemplates'`；成功后刷新调用方              |
| `packages/shared/src/components/Apps/Applications/AppTypeTable/OPAppTable/EdgeWorkloads/index.tsx:75` | `workload.batch.delete.v2`                     | `workload` / `'deployments'`                              | 传入 cluster、namespace、`type: 'DEPLOYMENT'` 和选中 resource；成功后更新本地边缘工作负载状态  |
| `packages/shared/src/components/Apps/AppsDeploySpaceModal/index.tsx:71`                               | `batch.deploy.app.create.v2`                   | `edgeStore` / `{ module: 'edgeappsets' }`                 | 传入 cluster、workspace、namespace、版本和应用详情；`onOK` 回调随后调用当前 V4 `deployApp`     |
| `packages/shared/src/components/Modals/AppTemplateEdit/index.tsx:32`                                  | `openpitrix.template.edit.v2`                  | `appStore` / `{ module: 'edgeappsets' }`                  | 传入 workspace 和整理后的模板详情；提供 `success`、`onCancel` 回调                             |

当前 Hook 的默认值和 Wujie 生命周期由 `packages/shared/src/hooks/useV3Actions/index.tsx` 固定：首次打开延迟 1000ms 后发送 `triggerAction`，后续打开立即发送；目标实例名为 `consoleV3Actions`，URL 为 `/consolev3/dashboard`。旧兼容桥 `packages/console/src/actions/v3actions.tsx` 使用实例名 `consolev3` 和 `/consolev3/`，也使用同一个 `triggerAction` 总线。这两个实例路径不能在替换前合并推断，必须分别核对运行时加载和卸载行为。

### 2.2 旧源码与当前制品 Action 对照

在 `origin/release-3.4` 中，`workload.template.edit`、`devops.edit` 和 `devops.create` 可在 `src/actions/workload.js`、`src/actions/devops.js` 中直接定位；旧实现分别打开配置模板编辑、DevOps 编辑和创建弹窗，并通过旧 Store 执行更新或创建。其余带 `.v2` 的当前调用 key 在该 release-3.4 源码文本中没有直接匹配，但在当前 `packages/bootstrap/assets/v3dist` 中可以找到字符串：

| 当前 Action                     | 当前 `v3dist` 字符串证据                                                                                            | `release-3.4` 源码匹配    | 当前结论                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------- |
| `workload.template.edit`        | `8.efefc7072f02199ebc47.js`、`3.bb6cbee4309e765b70c1.js`、`1.9ca3a76d71946712055c.js`                               | `src/actions/workload.js` | 旧源码行为可继续对照，运行时入口仍待验证             |
| `devops.edit` / `devops.create` | `6.8bcf3ff261066d30352e.js`、`16.c38048441fc60c1f26b2.js`、`3.bb6cbee4309e765b70c1.js`                              | `src/actions/devops.js`   | 旧源码行为可继续对照，运行时入口仍待验证             |
| `notification.user.setting`     | `14.87db00577a502c52dfc5.js`、`3.bb6cbee4309e765b70c1.js`、`1.9ca3a76d71946712055c.js`                              | 未匹配                    | 只能证明当前编译制品含字符串，不能证明触发入口或行为 |
| `batch.deploy.app.create.v2`    | `7.e17520c994653ce8d2f4.js`、`1.9ca3a76d71946712055c.js`                                                            | 未匹配                    | 只能证明当前编译制品含字符串，不能反推旧源码实现     |
| `app.template.create.v2`        | `7.e17520c994653ce8d2f4.js`、`1.9ca3a76d71946712055c.js`                                                            | 未匹配                    | 只能证明当前编译制品含字符串，不能反推旧源码实现     |
| `openpitrix.template.edit.v2`   | `7.e17520c994653ce8d2f4.js`、`14.87db00577a502c52dfc5.js`、`3.bb6cbee4309e765b70c1.js`、`1.9ca3a76d71946712055c.js` | 未匹配                    | 只能证明当前编译制品含字符串，不能反推旧源码实现     |

上述“未匹配”是限定在 `origin/release-3.4` 的源码边界内，不是对所有 V3 版本或当前制品行为的否定。

## 3. 旧 V3 Action 规模和模块重点

在 `origin/release-3.4` 上执行：

```bash
git ls-tree -r --name-only origin/release-3.4 src/actions | wc -l
git grep -h -o -E "'[^']+': \\{\" origin/release-3.4 -- src/actions | wc -l
```

结果：36 个 Action 文件、约 170 个静态 Action key。与当前 P2 模块直接相关的旧 Action 至少包括：

| 资源           | 旧 Action key                                                              | 旧源码位置                                     |
| -------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| ConfigMap      | `configmap.create`、`configmap.edit`                                       | `src/actions/configmap.js`                     |
| Secret         | `secret.create`、`secret.edit`、`secret.default`                           | `src/actions/secret.js`                        |
| ServiceAccount | `serviceaccount.create`、`serviceaccount.edit`、`serviceaccount.role.edit` | `src/actions/serviceaccount.js`                |
| 通用资源       | `resource.baseinfo.edit`、`resource.yaml.edit`、`resource.delete`          | `src/actions/resource.edit.js`、资源页面调用点 |
| 工作负载       | `workload.create`、`workload.template.edit`、`workload.hpa.edit`           | `src/actions/workload.js`                      |

旧 Action key 的静态数量不能当作启用功能数量；需要按路由、菜单、权限和运行时调用去重。

## 4. 关闭条件

P0-U002 的 Action 部分仍未关闭。每个当前调用点必须补充：

1. 调用文件、Action 名和传参结构；
2. 对应旧 V3 模块、Store、API 和权限；
3. 131 环境中触发入口、弹窗、Network、成功/失败反馈；
4. V4 替代实现、不能替代的行为和回滚路径。

静态库存只作为候选清单，不能宣布 Action 迁移完成，也不能授权删除 V3 桥接代码。

## 5. 2026-10-20 当前活动路由复核

以当前 `feature/v4-configmaps-secrets` 工作树重新核对后，非测试源码中的 `useV3action/useV3Actions` 命中 11 个文件：8 个业务调用文件、2 个桥接实现/Hook 文件和 1 个导出文件；8 个业务文件对应 9 个当前活动 Action 行（DevOps 的 create/edit 分开计算）。此前本文件第 2 节的 14 个文件是历史 P0 取证基线口径，不能继续作为当前活动调用数量。

当前项目 Deployment、StatefulSet、DaemonSet 详情活动路由由 `packages/console/src/pages/projects/routes/detail.tsx` 导入 `ApplicationWorkloads/Workloads/*/Detail/routes.tsx`，不再导入旧 `projects/containers/*/Detail` 文件。旧文件仍含 Wujie 代码，暂按兼容残留登记，待完成全仓库消费者复核后再决定是否删除。
