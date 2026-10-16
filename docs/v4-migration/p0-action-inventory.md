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

排除测试文件后，`useV3action` 出现在 13 个源码文件中：

```text
packages/console/src/pages/projects/components/ConfigReference/entry.tsx
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/DaemonSets/Detail/index.tsx
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/Deployments/Detail/index.tsx
packages/console/src/pages/projects/containers/ApplicationWorkloads/Workloads/StatefulSets/Detail/index.tsx
packages/console/src/pages/projects/containers/Applications/AppTypeTable/OPAppTable/index.tsx
packages/console/src/pages/workspaces/containers/Devops/index.tsx
packages/shared/src/components/Apps/AppCreate/index.tsx
packages/shared/src/components/Apps/Applications/AppTypeTable/OPAppTable/EdgeWorkloads/index.tsx
packages/shared/src/components/Apps/AppsDeploySpaceModal/index.tsx
packages/shared/src/components/Modals/AppTemplateEdit/index.tsx
packages/shared/src/hooks/useV3Actions/index.tsx
packages/console/src/actions/v3actions.tsx
packages/shared/src/hooks/index.ts
```

其中 `hooks/index.ts` 是导出文件，`actions/v3actions.tsx` 是桥接实现，二者不应按业务调用点重复计数。实际业务调用集中在工作负载详情、配置引用、应用创建/部署、DevOps 等路径。

## 3. 旧 V3 Action 规模和模块重点

在 `origin/release-3.4` 上执行：

```bash
git ls-tree -r --name-only origin/release-3.4 src/actions | wc -l
git grep -h -o -E "'[^']+': \\{\" origin/release-3.4 -- src/actions | wc -l
```

结果：36 个 Action 文件、约 170 个静态 Action key。与当前 P2 模块直接相关的旧 Action 至少包括：

| 资源 | 旧 Action key | 旧源码位置 |
| --- | --- | --- |
| ConfigMap | `configmap.create`、`configmap.edit` | `src/actions/configmap.js` |
| Secret | `secret.create`、`secret.edit`、`secret.default` | `src/actions/secret.js` |
| ServiceAccount | `serviceaccount.create`、`serviceaccount.edit`、`serviceaccount.role.edit` | `src/actions/serviceaccount.js` |
| 通用资源 | `resource.baseinfo.edit`、`resource.yaml.edit`、`resource.delete` | `src/actions/resource.edit.js`、资源页面调用点 |
| 工作负载 | `workload.create`、`workload.template.edit`、`workload.hpa.edit` | `src/actions/workload.js` |

旧 Action key 的静态数量不能当作启用功能数量；需要按路由、菜单、权限和运行时调用去重。

## 4. 关闭条件

P0-U002 的 Action 部分仍未关闭。每个当前调用点必须补充：

1. 调用文件、Action 名和传参结构；
2. 对应旧 V3 模块、Store、API 和权限；
3. 131 环境中触发入口、弹窗、Network、成功/失败反馈；
4. V4 替代实现、不能替代的行为和回滚路径。

静态库存只作为候选清单，不能宣布 Action 迁移完成，也不能授权删除 V3 桥接代码。
