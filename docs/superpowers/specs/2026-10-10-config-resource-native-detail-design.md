# ConfigMap/Secret 原生详情路由设计

## 背景

当前 ConfigMap 和 Secret 详情页通过 Wujie 嵌入 V3 页面，再在 Shadow DOM 中注入“修改记录、元数据、事件”三个入口。该方式依赖 V3 内部 DOM 结构和样式，直接访问深层 URL、刷新、前进后退以及 V3 重渲染时都可能丢失入口或产生布局错位。

Deployment、StatefulSet 和 DaemonSet 已经使用 V4 外层路由承载工作负载详情 Tab；ConfigMap/Secret 应采用同样的 V4 路由模型。

## 目标

- ConfigMap 和 Secret 详情页由 V4 React 路由直接承载。
- 保持四个同级 Tab：数据、修改记录、元数据、事件。
- 保留当前 ConfigMap/Secret 的编辑信息、编辑 YAML、编辑配置、删除、Secret 脱敏和数据展示能力。
- 修改记录复用现有 `ConfigHistoryPage`，不再通过 Shadow DOM 注入。
- 元数据复用共享 `MetaData` 组件，事件复用共享 `Events` 组件。
- Deployment 等工作负载路由继续使用现有 V3 制品，不在本次范围内迁移。

## 非目标

- 不修改 V3 制品源码或 V3 工作负载页面。
- 不修改 ConfigMap/Secret 的 Kubernetes API、RBAC 或历史 Secret 数据格式。
- 不在本次增加 ConfigMap/Secret 的环境变量入口；`env` 只属于工作负载详情。

## 路由与组件结构

```text
/:workspace/clusters/:cluster/projects/:namespace/configmaps/:name
├── detail
├── revision-control
├── metadata
└── events

/:workspace/clusters/:cluster/projects/:namespace/secrets/:name
├── detail
├── revision-control
├── metadata
└── events
```

ConfigMap/Secret 详情容器负责请求详情、侧栏属性和操作按钮；子路由只读取共享 DetailPage 上下文并渲染自己的内容。详情页可以继续使用现有 stores 和数据组件，但不再包裹 `WujieReact`。

## 数据流

1. `configMapStore` 或 `secretStore` 请求 Kubernetes 资源详情并写入 `DetailPage` 上下文。
2. `detail` Tab 使用现有 ConfigMap/Secret 数据组件。
3. `metadata` Tab 将详情转换为 `MetaData detail={detail}`，只读显示 labels/annotations。
4. `events` Tab 使用共享事件组件，按资源名称和 namespace 查询事件。
5. `revision-control` Tab 调用现有 `ConfigHistoryPage`，传入当前 cluster、namespace、name 和 kind。
6. 编辑、YAML、删除成功后统一触发 DetailPage refetch；历史页读取最新对象 annotations 和历史 Secret。

## 错误与加载状态

- 详情加载沿用 `DetailPage` 的 Loading/Error 状态。
- 元数据和事件在 detail 缺失时显示 Loading/空状态，不通过 `null` 静默失败。
- 修改记录保留当前 404 表示“尚无历史”的语义，并显示可解释的空状态；其他请求错误显示目标 URL 和服务端错误摘要。
- Secret 数据始终沿用现有脱敏逻辑，原始 Secret 内容不写入日志或测试快照。

## 验收标准

- 直接打开、刷新和浏览器前进后退均能访问 ConfigMap/Secret 的四个 Tab。
- ConfigMap 的数据、修改记录、元数据、事件均显示真实资源数据。
- Secret 的数据仍按类型显示并默认脱敏，修改记录、元数据、事件显示真实资源数据。
- 页面不依赖 `wujie-app`、Shadow DOM、V3 固定 class 或注入定时器。
- Deployment 的 `resource-status`、`revision-control`、`metadata`、`env`、`events` 和 `config-reference` 回归不受影响。
- 131 环境中使用 Playwright 完成真实登录后的浏览器验收，并保留截图/快照证据。
