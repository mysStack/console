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

| 检查项                         | 结果                                                                 |
| ------------------------------ | -------------------------------------------------------------------- |
| HPA 定向回归测试               | 通过，1/1                                                            |
| `./scripts/test.sh`            | 通过，69 个测试文件、249 个测试通过                                  |
| 变更文件 ESLint                | 通过，0 错误；保留已有警告                                           |
| Prettier                       | 通过                                                                 |
| `corepack yarn build:packages` | 通过                                                                 |
| 第一版修复部署后浏览器复验     | HPA URL 已无重复 `/apis/`，但同一正确 URL 仍被重复请求并触发资源耗尽 |

## 结论边界

## 部署后复验发现的第二个缺陷

第一版修复已部署到 131，tag 为 `feature-v4-configmaps-secrets-20261020-015729-c9a311a56c5d`，Pod imageID 对应 manifest digest `sha256:cd54b3ef13605197416d18833740d8ef280eea009c04b03242d8fe2c0e5f5a7d`。真实浏览器复验确认重复 `/apis/apis/` 已消失，但正确的 HPA URL 在单次页面加载中仍出现 194 次，并继续伴随 `ERR_INSUFFICIENT_RESOURCES`。

进一步定位发现 `useCacheStore` 每次渲染都会创建新的 setter 函数，而原生 Workload 详情父组件把该 setter 放在同步详情的 `useEffect` 依赖中，导致缓存写入、父组件重渲染和 HPA 检查请求形成循环。已将 setter 改为 `useCallback`。

第二版修复已提交为 `3ee15af9ad2b85d2b9e83aea9db978a6104f93a0`，GitHub Actions Run `39302192970` 的 Unit tests 和 Build and publish 均成功。131 使用镜像 tag `feature-v4-configmaps-secrets-20261020-022516-3ee15af9ad2b`，manifest digest 为 `sha256:27d44f7e001a6c5593ce39a5fbde2cb53dcdcb75959ab3a2f57114ee5b3f25b9`；Deployment `538/538`，Pod `ks-console-7c875999cf-6zw2g` 为 `Running/Ready`，实际 imageID 与该 digest 一致，rollout 后策略已恢复为 `maxUnavailable=0/maxSurge=1`。

部署后重新登录真实浏览器并访问 Deployment、StatefulSet、DaemonSet 原生详情页：三个页面均正常渲染，重复 `/apis/apis/` 请求为 0，`ERR_INSUFFICIENT_RESOURCES` 为 0；DaemonSet 的“更多操作”菜单、原生“编辑 YAML”弹窗及取消路径均可用。页面仍有已登记的扩展初始化错误和 WebSocket 403，这些不属于本次 HPA 修复范围，扩展运行时错误按负责人指令暂缓处理。测试创建的 DaemonSet、Deployment、StatefulSet 已删除，namespace 复核只剩系统 `kube-root-ca.crt` ConfigMap 和默认 ServiceAccount。

该记录关闭了当前三个原生 Workload 详情页的 HPA URL 重复和请求循环缺陷，但不代表 A02～A04 的完整 V3 功能等价、字段、权限、成功/失败/取消、刷新返回和 V3/Wujie 全局清理已经完成。
