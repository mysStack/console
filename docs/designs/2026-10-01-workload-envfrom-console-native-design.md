# 工作负载 ConfigMap/Secret 引用需求与交互设计

## 1. 背景与问题

当前项目工作负载页面通过 Console 的 Wujie 容器加载独立的 V3 制品。Console 的 `Deployments`、`StatefulSets` 和 `DaemonSets` 页面仍然依赖 V3 的路由、React 运行时、全局样式和表单状态。

这种方式可以快速复用旧功能，但会带来以下耦合：

- Console 和 V3 各自维护路由、认证上下文和国际化状态；
- V3 页面尺寸和 CSS 假设可能与 Console 宿主容器冲突；
- 新功能必须先修改 V3，再构建 V3 制品，再更新 Console 镜像；
- 页面问题难以判断是 V3、Wujie 容器还是 Console 路由造成的。

本阶段定义工作负载配置引用和配置变更生效的产品需求，不以替换现有完整工作负载页面为前提。实现方案必须同时满足：保留已有工作负载能力、支持整份 ConfigMap/Secret 引用，以及在配置变更后让用户可控地滚动重启受影响工作负载。

## 2. 目标

1. 在 Console 原生 Deployment、StatefulSet、DaemonSet 的创建、编辑流程中支持 ConfigMap/Secret 的 `envFrom` 引用。
2. 保留现有逐 Key 环境变量引用能力，并允许与 `envFrom` 同时使用。
3. 在配置编辑成功后查询受影响工作负载，并提供用户确认后的异步滚动重启。
4. 配置引用相关交互归属于“环境变量”区域；“单项环境变量（`env`）”和“整体配置引用（`envFrom`）”是该区域下的两个并列子区域。
5. 不因新增配置引用而删除、缩水或替换现有工作负载创建/编辑能力。
6. 实现方案可以保留 V3 或迁移到 Console，但必须提供可回滚路径，并通过完整页面回归后才能切换入口。

## 3. 非目标

- 本阶段不迁移 Job、CronJob 的创建或编辑页面；但配置变更影响查询必须识别 CronJob 的 Pod Template 引用。
- 本阶段不删除 `kse-console-v3` 仓库或 V3 制品。
- 本阶段不修改 Kubernetes API、ks-apiserver 或 ks-controller-manager。
- 本阶段不实现 ConfigMap/Secret 文件挂载；文件挂载使用 `volumes` 和 `volumeMounts`，另立 P1 任务。
- 本阶段不升级 V3 的 React、Webpack 或旧版组件依赖。

## 4. 交互与生效流程

### 4.1 工作负载表单中的层级

工作负载表单保留原有全部字段，在容器配置区域使用以下层级：

```text
容器配置
└── 环境变量
    ├── 单项环境变量（env）
    └── 整体配置引用（envFrom）
        ├── ConfigMap
        └── Secret
```

`env` 和 `envFrom` 在 Kubernetes 数据模型中是容器下的同级字段，但在产品界面中统一归入“环境变量”，不把“配置引用”提升为与容器、存储、探针同级的顶层模块。

### 4.2 ConfigMap/Secret 保存后的交互

```text
保存 ConfigMap/Secret
        │
        ▼
显示“配置已保存，正在检查引用”
        │
        ▼
查询当前项目中受影响的工作负载
        │
   ┌────┴────┐
   │         │
无引用      有引用
   │         │
成功提示    展示受影响资源选择弹窗
             │
       ┌─────┴─────┐
       │           │
    仅保存      重启已选工作负载
       │           │
    结束       异步滚动更新并轮询状态
```

弹窗要求：

- 展示资源类型、名称、当前状态和是否可重启；
- 默认不选中任何资源，避免修改公共配置时意外重启大量服务；
- 提供“全选”操作；
- “仅保存”直接结束流程；
- “重启已选工作负载”在没有选中资源时禁用；
- 重启过程中逐项展示成功、失败、无权限、更新中和资源不存在；
- 查询失败不能伪装成“没有引用”，应提供重试或仅保存选项；
- 不展示 Secret 值，也不把 Secret 值写入请求日志、事件或错误信息。

## 5. 实现边界（方案待确认）

本文件当前只锁定需求、数据契约、交互和验收，不锁定“原生表单”或“V3 改造”其中任何一种实现方案。后续方案必须满足以下硬约束：

- 不能用精简表单替换现有完整工作负载创建/编辑能力；
- 不能删除或覆盖现有副本、卷、探针、调度、服务、更新策略等字段；
- `env` 与 `envFrom` 必须在同一个“环境变量”配置区域中共存；
- 配置保存后的受影响工作负载查询和用户确认重启必须可回滚、可观测；
- 方案切换前必须完成完整页面回归，不能只验证新增控件。

可评估的实现方向包括：

1. 在现有完整 V3 表单中增加 `envFrom`，并完整构建匹配的 V3 制品；
2. 在 Console 中迁移完整工作负载表单，而不是只迁移基础字段；
3. 保留原表单，增加独立的配置引用及受影响工作负载重启入口。

最终方案需在单独技术评审后确定，不能仅以“新增控件测试通过”作为切换依据。

```text
需求边界
├── 完整工作负载表单能力保持不变
├── 环境变量
│   ├── 单项环境变量（env）
│   └── 整体配置引用（envFrom）
└── 配置变更后的受影响工作负载查询与确认重启
```

### 5.1 本阶段需求范围

本阶段需要覆盖三种标准工作负载的创建、编辑和配置变更影响处理：

```text
/workspace/clusters/cluster/projects/namespace/deployments
/workspace/clusters/cluster/projects/namespace/deployments/new
/workspace/clusters/cluster/projects/namespace/deployments/:name/edit

/workspace/clusters/cluster/projects/namespace/statefulsets
/workspace/clusters/cluster/projects/namespace/statefulsets/new
/workspace/clusters/cluster/projects/namespace/statefulsets/:name/edit

/workspace/clusters/cluster/projects/namespace/daemonsets
/workspace/clusters/cluster/projects/namespace/daemonsets/new
/workspace/clusters/cluster/projects/namespace/daemonsets/:name/edit
```

三种工作负载需要支持同一套环境变量与 `envFrom` 语义；控制器特有字段必须继续保留：Deployment 的副本和滚动更新、StatefulSet 的 Headless Service 与 `volumeClaimTemplates`、DaemonSet 的节点调度和更新策略。具体由 V3 扩展、完整 Console 迁移或独立配置入口实现，待方案评审确定。

### 5.2 回滚策略

- 新实现必须能够独立关闭或回滚，不影响现有工作负载入口；
- 不能通过删除 V3 制品或覆盖单个压缩文件完成切换；
- 迁移或扩展期间不修改已存在工作负载的非目标 YAML 字段；
- 切换前必须完成完整工作负载表单回归和测试环境部署验证。

## 6. Kubernetes 数据契约

### 6.1 整体引用

ConfigMap：

```yaml
envFrom:
  - configMapRef:
      name: app-config
      optional: false
```

Secret：

```yaml
envFrom:
  - secretRef:
      name: app-secret
      optional: false
```

带前缀时：

```yaml
envFrom:
  - configMapRef:
      name: app-config
    prefix: APP_
```

### 6.2 约束

- 引用资源必须属于当前 Cluster/Project 可见范围；
- 页面只展示 Secret 名称和元数据，不读取、不回显 Secret 值；
- 同一容器不得重复引用同类型同名称资源；
- 空行、缺失名称和已删除资源不得静默提交；
- 读取已有工作负载时必须保留原始引用，即使当前列表中暂时找不到资源；
- `env` 与 `envFrom` 可以同时存在，不能互相覆盖。

## 7. Console 组件边界

原生实现拆为三个职责：

1. `EnvFromReference`：只负责 ConfigMap/Secret 选择、加载状态、错误状态和删除交互。
2. `envFrom` 转换模块：只负责 UI 模型与 Kubernetes 模型互转、重复校验和空项清理。
3. 工作负载表单适配器：将转换结果写入 Deployment、StatefulSet、DaemonSet 的 Pod Template，不负责读取 Secret 内容。

转换模块必须是纯函数，便于单元测试和后续复用于 StatefulSet、DaemonSet。

## 8. 错误与权限处理

- 列表加载中：选择控件禁用并显示加载状态；
- 列表加载失败：显示明确错误和重试按钮，不把失败伪装成空列表；
- 资源被删除：编辑时保留名称并标记不可用，提交时阻止保存并定位到该行；
- 无权限读取资源：不显示资源值，错误信息不得包含 Secret 内容；
- API 返回 401/403：沿用 Console 统一登录失效和权限错误处理；
- 后端 API 不增加新字段，优先复用现有工作负载创建/更新接口。
- 配置影响查询和批量重启可以复用已有工作负载 API；若现有 API 无法安全完成资源查询或批量触发，必须在技术设计阶段明确新增的最小接口，不得在前端拼接未经授权的 Kubernetes 请求。

## 9. 测试与验收

### 9.1 单元测试

- ConfigMap 无前缀序列化；
- Secret 带前缀序列化；
- `env` 与 `envFrom` 同时存在；
- 重复引用拦截；
- 空项清理；
- 已删除资源回显；
- Secret 值不出现在组件快照和错误信息中。
- 配置保存后无引用、有引用、查询失败三种结果；
- 仅保存不触发重启；
- 仅重启用户勾选的工作负载；
- 部分重启成功、部分失败时逐项展示结果。

### 9.2 集成测试

- 创建和编辑 Deployment、StatefulSet、DaemonSet 后检查各自 Pod Template 中的 `envFrom`；
- ConfigMap 和 Secret 各至少验证一次；
- 通过 `kubectl exec` 或 Pod 环境检查确认变量实际注入；
- 原有逐 Key `env.valueFrom` 仍然可用。
- 修改 ConfigMap/Secret 后，分别验证 `env.valueFrom` 和 `envFrom` 能被查询到；
- 验证 Deployment、StatefulSet、DaemonSet 的滚动重启，以及 CronJob 引用的识别；
- 验证只保存、选择性重启、无权限、资源删除和部分失败场景。

### 9.3 浏览器回归

至少验证 1280、1440、1920 CSS 宽度：

- 创建表单不发生横向溢出或字段重叠；
- ConfigMap/Secret 下拉可选择；
- 加载中、失败、空列表状态可见；
- 创建、编辑、取消和回滚路由正常；
- 不依赖 V3 页面才能显示核心表单。

## 10. 发布边界

- 本期前端功能分支：`feature/workload-envfrom-console`；
- 以 `console/release-4.1.5` 为基线；
- 前后端是否都需要改动，以最终技术方案和影响查询/批量重启 API 评审结果为准；
- 构建产物使用独立测试 Tag，验证完成后再合并 `release-4.1.5`；
- 在完整工作负载回归和配置变更重启验收完成前，不切换正式入口或覆盖 V3 制品。

## 11. 当前状态与边界

需求与交互已完成整合；实现方案、代码和测试环境验收尚未完成，不能宣称本阶段已实现。

现有工作负载页面能力必须作为回归基线。任何路由、V3 制品或原生表单改动，都必须先证明原有功能仍然存在，再验证 `envFrom` 和配置变更重启流程。

普通环境变量的 `valueFrom` 编辑控件和 `envFrom` 的 `optional` 字段暂列为后续增强，不影响本阶段的核心验收。

本地验证使用仓库现有 `esno` + Node test runner；生产构建在 Node/OpenSSL 兼容参数 `NODE_OPTIONS=--openssl-legacy-provider` 下通过。浏览器和集群验收仍需在测试环境部署独立镜像后执行，不在本地构建阶段宣称已完成。
