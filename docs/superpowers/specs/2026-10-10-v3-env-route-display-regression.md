# Deployment 环境变量路由显示回归规格

## 背景

测试环境中打开
`/:workspace/clusters/:cluster/projects/:namespace/deployments/:name/env`
时，页面由完整的 V3 工作负载详情页提供。近期在 Console 外层增加配置引用展示后，`ams-server` 等真实工作负载出现环境变量页内容缺失、配置引用不显示或布局被挤压的回归风险。

本规格只约束环境变量只读页的显示和桥接行为，不重新实现 V3 工作负载编辑器，也不把 V3 的其他详情页迁移到 V4。

## 目标

1. 保留 V3 环境变量页的完整原始内容：容器卡片、普通 `env` 行、`valueFrom` 行、页面标题、导航和已有操作均不能被配置引用模块替换或隐藏。
2. 在每个实际容器卡片内部展示该容器的 `envFrom` 配置引用摘要；没有引用时不插入空白卡片或占位区域。
3. 兼容 V3 不同构建产物的 DOM 差异：容器卡片可以嵌套在列表包装元素中，容器图标可以通过 `#icon-docker` 或带该 fragment 的 sprite URL 引用。
4. 直接打开、刷新、前进后退和从其他工作负载详情 Tab 切换到 `env` 时，均能正确识别环境变量页。
5. 配置引用加载期间、资源为空、资源读取失败时，给出明确的状态；错误不得静默导致整个环境变量页为空白。

## 非目标

- 不修改 V3 压缩制品中的单个 JS/CSS 文件。
- 不改变 Deployment、StatefulSet、DaemonSet 的创建/编辑表单和现有字段。
- 不把配置引用改成独立的工作负载编辑器，也不读取或显示 Secret 值。
- 不在本规格中实现 ConfigMap/Secret 原生详情路由；详情路由见
  `2026-10-10-config-resource-native-detail-design.md`。

## 页面与桥接契约

### 路由识别

桥接层只在当前活动路径为 `/env` 时向 V3 环境变量内容区域挂载摘要。以下路径不得挂载环境变量摘要：

- `/resource-status`
- `/revision-control`
- `/metadata`
- `/monitoring`
- `/events`

路径末尾允许存在或不存在 `/`，并且必须支持带 workspace、cluster、project 和 workload 名称的完整路径。

### 容器定位

桥接层从活动环境变量内容区域中定位容器卡片：

- 以容器图标的 `use` 元素作为稳定锚点；
- 接受 `href="#icon-docker"`、`xlink:href="#icon-docker"` 以及以 `#icon-docker` 结尾的 sprite URL；
- 从图标向上查找包含容器标题的最近卡片，不要求卡片必须是环境变量 pane 的直接子元素；
- 同一卡片包含多个图标时只生成一个摘要；
- 容器名称只来自该卡片标题，不得用页面中其他工作负载名称或容器索引覆盖。

### 原页面保留

配置引用摘要必须是 V3 卡片内的附加节点或 portal。挂载失败、数据为空或当前工作负载没有 `envFrom` 时，V3 原始环境变量内容仍必须完整显示。任何异常都只能影响摘要本身，不能清空 `detail-page-content`。

### 数据与安全

- `configMapRef`、`secretRef` 只展示资源类型、资源名称和可选前缀。
- Secret 的 `data`、解码值和请求响应正文不得进入页面、日志、错误消息或测试快照。
- 引用数据按容器名称匹配；只有在容器名称与卡片数量都能可靠对应时才允许使用位置兜底，不能把一个容器的引用显示到另一个容器。
- 资源列表加载中显示“加载中”，失败显示“读取失败”并提供重试，空列表显示“没有可用资源”。

## 验收标准

### 自动化测试

- 桥接单元测试覆盖：`/env` 与非 `/env` Tab、末尾斜杠、嵌套卡片、fragment/sprite URL、重复图标去重、无标题卡片和异常 DOM。
- 配置引用组件测试覆盖：无引用不渲染、按容器渲染、加载中、失败、空列表、Secret 不泄露。
- 回归测试确认普通 `env`、`configMapKeyRef`、`secretKeyRef` 的原始行和 V3 页面结构未被修改。

### 真实浏览器

使用 Playwright 登录 131 测试环境后，使用真实工作负载 `ams-server` 和至少一个含多容器的工作负载验证：

1. 打开 `/test-workspace/clusters/host/projects/test-wes/deployments/ams-server/env`，页面显示完整的 V3 环境变量内容，不能白屏、空白或只显示摘要。
2. 从 `resource-status`、`revision-control`、`metadata`、`events` 切换到 `env`，摘要只出现在 `env` 页。
3. 刷新、复制完整 URL 直接打开、浏览器后退/前进后，容器卡片和摘要仍存在，且不重复插入。
4. 含 ConfigMap/Secret `envFrom` 的容器展示对应名称和前缀；没有引用的容器不显示空白摘要。
5. 改变窗口宽度到 1280、1440、1920 像素，原 V3 布局无横向溢出、重叠、英文 key 替代中文文案或按钮不可点击。
6. 浏览器控制台没有由配置引用桥接新增的未捕获异常；Secret 值不出现在 DOM、网络日志或截图中。

## 回滚边界

若摘要桥接造成 V3 页面空白、容器卡片错位或非 `env` Tab 被污染，立即回退桥接提交/镜像即可；不回滚工作负载对象、ConfigMap、Secret、PVC 或 V3 制品。回滚后必须重新验证上述直接导航和 Tab 回归路径。

## 相关实现

- `packages/console/src/pages/projects/components/ConfigReference/bridge.ts`
- `packages/console/src/pages/projects/components/ConfigReference/bridge.test.ts`
- `packages/console/src/pages/projects/components/ConfigReference/ConfigReferenceSummary.tsx`
- `packages/console/src/pages/projects/containers/Deployments/Detail/index.tsx`
