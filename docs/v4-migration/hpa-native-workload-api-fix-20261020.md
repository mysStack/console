# 原生 Workload HPA API 路径修复记录（2026-10-20）

## 发现与复现

在 131 测试环境用真实 Playwright 访问项目 Deployment、StatefulSet 和 DaemonSet 原生详情页时，页面反复请求以下错误地址：

```text
/clusters/host/apis/apis/autoscaling/v2beta2/namespaces/<namespace>/horizontalpodautoscalers/<name>
```

浏览器控制台日志中同一错误地址出现 282 次，并伴随 `Network Error` 和 `ERR_INSUFFICIENT_RESOURCES`。该问题影响原生 Workload 详情页的资源状态加载和后续操作菜单交互。

## 根因

`packages/shared/src/constants/common.ts` 中 HPA 默认版本常量为 `apis/autoscaling/v2beta2`，而 HPA 调用方统一使用 `/apis/${version}` 拼接路径。集群版本信息尚未加载时，`getApiVersion` 返回带 `apis/` 的默认值，因此形成重复前缀。

## 修复

- 在 `packages/shared/src/utils/getApiVersion.ts` 增加 `getHpaApiVersion`，统一移除默认值开头的 `apis/`。
- HPA Store 的删除、更新和创建请求改用该辅助函数。
- 原生资源状态和自动伸缩弹窗的 HPA 请求改用该辅助函数。
- 新增 `getApiVersion.test.ts`，覆盖无集群版本和 Kubernetes 版本已知两种路径。

## 本地验证

| 检查项                         | 结果                                |
| ------------------------------ | ----------------------------------- |
| HPA 定向回归测试               | 通过，1/1                           |
| `./scripts/test.sh`            | 通过，69 个测试文件、249 个测试通过 |
| 变更文件 ESLint                | 通过，0 错误；保留已有警告          |
| Prettier                       | 通过                                |
| `corepack yarn build:packages` | 通过                                |
| 部署后浏览器复验               | 待完成，当前 131 仍为旧制品         |

## 结论边界

本记录证明了问题的浏览器复现、源码根因和本地修复验证，不能替代新制品构建、131 rollout、Pod imageID 核对和部署后 Playwright 验收。A02～A04 的完整 V3 功能等价性仍需继续验证，扩展运行时错误按负责人指令暂缓处理。
