# 配置引用与 Reloader 自动生效设计

## 状态

已确认，替代此前“影响工作负载分析 + 用户确认 + 自研重启控制器”设计。

## 决策

完整 V3 源码不可获得，完整 `v3dist` 仅作为稳定兼容制品使用。Console 不替换 V3 工作负载创建/编辑页，也不重建 V3 制品。

ConfigMap/Secret 的整体引用通过 Console 独立入口修改标准工作负载的 Kubernetes 原生 `envFrom` 字段。配置变化后的 Pod 滚动更新由独立安装的 Stakater Reloader 处理；Reloader 不需要 KubeSphere 专用 API、Controller 或通信协议。

## 边界

```text
Console
├── 配置引用入口：读取/更新 envFrom
└── 自动重启开关：管理 Reloader 注解

Kubernetes API
└── 保存 Deployment、StatefulSet、DaemonSet 的工作负载配置

Stakater Reloader
└── 监听 ConfigMap/Secret 变化并自动触发滚动更新

V3 制品
└── 保留全部既有工作负载创建、编辑、详情和路由能力
```

## 用户交互

入口位于工作负载详情页的“更多操作 → 配置引用”。面板提供 ConfigMap/Secret 引用列表、可选前缀和自动重启开关。

自动重启默认关闭。开启时在工作负载 `metadata.annotations` 写入：

```yaml
reloader.stakater.com/auto: 'true'
```

关闭时移除该键，保留其他注解。开启后，后续 ConfigMap/Secret 变化自动触发 Reloader；Console 不逐次弹出确认框。

## 非目标

- 不修改 V3 创建/编辑表单。
- 不修改或重建 `v3dist`。
- 不读取或展示 Secret 内容。
- 不自研配置引用反向扫描、重启队列、批量确认面板或 PodTemplate 重启 PATCH。
- 不处理 Job、CronJob、Helm values 的通用结构化映射和 ConfigMap/Secret 文件挂载。

## 降级与回滚

Reloader 未安装、不可用或被卸载时，`envFrom` 配置仍然保留；自动重启功能停止，Console 显示明确的基础设施不可用状态。关闭开关即可移除 Reloader 注解，不影响已有工作负载其他字段。

## 验收

1. Deployment、StatefulSet、DaemonSet 可新增、编辑、删除并回显 `envFrom` 引用。
2. 未启用自动重启时，配置资源变化不滚动 Pod。
3. 启用后，Reloader 对引用目标资源的工作负载触发滚动更新。
4. Secret 值不出现在 UI、请求或错误内容中。
5. 完整 V3 的列表、详情、创建、编辑页面在回归中保持可用。
