# 工作负载 ConfigMap/Secret 引用的 Console 原生迁移设计

## 1. 背景与问题

当前项目工作负载页面通过 Console 的 Wujie 容器加载独立的 V3 制品。Console 的 `Deployments`、`StatefulSets` 和 `DaemonSets` 页面仍然依赖 V3 的路由、React 运行时、全局样式和表单状态。

这种方式可以快速复用旧功能，但会带来以下耦合：

- Console 和 V3 各自维护路由、认证上下文和国际化状态；
- V3 页面尺寸和 CSS 假设可能与 Console 宿主容器冲突；
- 新功能必须先修改 V3，再构建 V3 制品，再更新 Console 镜像；
- 页面问题难以判断是 V3、Wujie 容器还是 Console 路由造成的。

本阶段只迁移工作负载中的 ConfigMap/Secret 整体环境变量引用能力，不重写全部 V3。

## 2. 目标

1. 在 Console 原生 Deployment、StatefulSet、DaemonSet 的创建、编辑流程中支持 ConfigMap/Secret 的 `envFrom` 引用。
2. 保留现有逐 Key 环境变量引用能力，并允许与 `envFrom` 同时使用。
3. Console 直接生成 Kubernetes 原生 Pod Template 字段，不依赖 V3 源码、V3 运行时或 Wujie 事件。
4. 旧 V3 工作负载页面在迁移期间继续可用，并可作为回滚路径。
5. 通过可控路由切换和测试矩阵，逐步将工作负载页面从 V3 迁移到 Console。

## 3. 非目标

- 本阶段不迁移 Job、CronJob 的创建或编辑页面。
- 本阶段不删除 `kse-console-v3` 仓库或 V3 制品。
- 本阶段不修改 Kubernetes API、ks-apiserver 或 ks-controller-manager。
- 本阶段不实现 ConfigMap/Secret 文件挂载；文件挂载使用 `volumes` 和 `volumeMounts`，另立 P1 任务。
- 本阶段不升级 V3 的 React、Webpack 或旧版组件依赖。

## 4. 目标架构

```text
Console release-4.1.5
└── feature/workload-envfrom-console
    ├── 原生标准工作负载创建/编辑表单
    │   ├── Deployment
    │   ├── StatefulSet
    │   └── DaemonSet
    ├── 共用 ConfigMap/Secret envFrom 选择器
    └── Kubernetes 工作负载序列化

V3 兼容层
└── 暂时承载未迁移的旧工作负载页面
```

Console 不直接 import V3 源码，也不从 V3 制品读取表单状态。V3 只保留为未迁移页面和回滚入口。

### 4.1 第一期迁移范围

第一期迁移三种标准工作负载的创建、编辑流程。列表和详情页继续沿用当前 Console/V3 入口，不在本期重写；创建和编辑成功后返回现有列表或详情页。

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

三种工作负载复用同一套容器、环境变量和 `envFrom` 组件；控制器特有字段由各自适配器处理：Deployment 的副本和滚动更新、StatefulSet 的 Headless Service 与 `volumeClaimTemplates`、DaemonSet 的节点调度和更新策略。

### 4.2 回滚策略

- 通过 Console 功能开关或路由配置控制 Deployment 原生页面是否启用；
- 关闭开关后，Deployment 路由恢复到 V3 入口；
- V3 制品版本保持锁定，不因原生页面开发而删除或覆盖；
- 迁移期间不修改已存在工作负载的 YAML 结构。

## 5. Kubernetes 数据契约

### 5.1 整体引用

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

### 5.2 约束

- 引用资源必须属于当前 Cluster/Project 可见范围；
- 页面只展示 Secret 名称和元数据，不读取、不回显 Secret 值；
- 同一容器不得重复引用同类型同名称资源；
- 空行、缺失名称和已删除资源不得静默提交；
- 读取已有工作负载时必须保留原始引用，即使当前列表中暂时找不到资源；
- `env` 与 `envFrom` 可以同时存在，不能互相覆盖。

## 6. Console 组件边界

原生实现拆为三个职责：

1. `EnvFromReference`：只负责 ConfigMap/Secret 选择、加载状态、错误状态和删除交互。
2. `envFrom` 转换模块：只负责 UI 模型与 Kubernetes 模型互转、重复校验和空项清理。
3. 工作负载表单适配器：将转换结果写入 Deployment、StatefulSet、DaemonSet 的 Pod Template，不负责读取 Secret 内容。

转换模块必须是纯函数，便于单元测试和后续复用于 StatefulSet、DaemonSet。

## 7. 错误与权限处理

- 列表加载中：选择控件禁用并显示加载状态；
- 列表加载失败：显示明确错误和重试按钮，不把失败伪装成空列表；
- 资源被删除：编辑时保留名称并标记不可用，提交时阻止保存并定位到该行；
- 无权限读取资源：不显示资源值，错误信息不得包含 Secret 内容；
- API 返回 401/403：沿用 Console 统一登录失效和权限错误处理；
- 后端 API 不增加新字段，优先复用现有工作负载创建/更新接口。

## 8. 测试与验收

### 8.1 单元测试

- ConfigMap 无前缀序列化；
- Secret 带前缀序列化；
- `env` 与 `envFrom` 同时存在；
- 重复引用拦截；
- 空项清理；
- 已删除资源回显；
- Secret 值不出现在组件快照和错误信息中。

### 8.2 集成测试

- 创建和编辑 Deployment、StatefulSet、DaemonSet 后检查各自 Pod Template 中的 `envFrom`；
- ConfigMap 和 Secret 各至少验证一次；
- 通过 `kubectl exec` 或 Pod 环境检查确认变量实际注入；
- 原有逐 Key `env.valueFrom` 仍然可用。

### 8.3 浏览器回归

至少验证 1280、1440、1920 CSS 宽度：

- 创建表单不发生横向溢出或字段重叠；
- ConfigMap/Secret 下拉可选择；
- 加载中、失败、空列表状态可见；
- 创建、编辑、取消和回滚路由正常；
- 不依赖 V3 页面才能显示核心表单。

## 9. 发布边界

- 本期前端功能分支：`feature/workload-envfrom-console`；
- 以 `console/release-4.1.5` 为基线；
- 本期没有后端改动，不创建空的后端同名分支；
- 构建产物使用独立测试 Tag，验证完成后再合并 `release-4.1.5`；
- V3 制品版本保持不变，直到三种原生标准工作负载页面均完成测试环境验收。
