# Workload YAML 校验缺陷 DEV 记录（2026-10-25）

## 1. 缺陷确认

在当前 `feature/v4-workloads` 制品 `4b363c688f1e784acb68fe32117756f03bb55bd2` 上，通过 131 浏览器的 Deployment 原生 YAML 编辑器提交非法 YAML。页面弹窗保持打开，Kubernetes API 返回 `400 Bad Request`，资源仍为 `1/1`；页面没有显示可见错误提示或 `role=alert`。

证据见 [`workload-yaml-validation-defect-20261025.json`](./evidence/workload-yaml-validation-defect-20261025.json)。

## 2. 根因

- `packages/shared/src/utils/yaml.ts` 的 `load` 捕获并吞掉 `js-yaml` 解析异常，然后返回原始字符串。
- Deployment、StatefulSet、DaemonSet 项目列表的 YAML handler 直接把该返回值交给更新 mutation。
- `useUpdateDeploymentMutation` 没有透传 `onError`，API 错误无法由三类页面统一反馈。

## 3. DEV 修复范围

1. 增加严格 YAML 解析入口，合法 YAML 返回对象，非法 YAML 抛出解析异常。
2. 三类资源的 YAML handler 在解析失败时停止 mutation，保留编辑弹窗并显示保存失败提示。
3. Workload 更新 mutation 透传 API 错误回调，覆盖 400、403、409 和网络失败的统一反馈入口。
4. 复用当前 V4 原生页面、Store 和错误提示，不引入 V3/Wujie。

## 4. 阶段处理

该缺陷属于 VERIFY 中发现的功能正确性问题，已按模块门禁退回 `DEV / 进行中`。修复提交后必须重新执行测试、构建、CI、131 rollout、Pod 镜像身份核对和部署后 Playwright 验收，旧制品的 VERIFY 证据不能替代新制品验证。
