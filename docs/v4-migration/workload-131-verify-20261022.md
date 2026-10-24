# Workload 独立分支 131 VERIFY 记录（2026-10-22）

## 验证边界

- 模块分支：`feature/v4-workloads`
- Worktree：`/home/bruce/code/ks-develop/console-workloads`
- 集成基线：`feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`
- 代码提交：`288fbccab63bebf76c3677beadc8b00c60c3cfd3`
- Draft PR：[#2](https://github.com/mysStack/console/pull/2)，目标分支为 `feature/v4-migration`
- 测试环境：`192.168.2.131:30880`
- 测试项目：`test-workspace` / `v4-migration-e2e`

本记录只证明当前独立分支已经实现部分 Workload 能力并完成对应的部署后验证。Deployment 高级创建配置、StatefulSet/DaemonSet 创建、Pod、Job/CronJob、完整 RBAC 和全部 V3 功能等价性仍未完成，因此 Workload 模块保持“开发中”。

## 本地与 CI 验证

| 检查项                         | 结果                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `./scripts/test.sh`            | 70 个文件、278 项通过、0 失败                                                                                                                                 |
| 相关 ESLint                    | 0 错误；`useCache` 保留 2 个本次改动前已存在的 Hook 警告                                                                                                      |
| Prettier                       | 通过                                                                                                                                                          |
| `git diff --check`             | 通过                                                                                                                                                          |
| `corepack yarn build:packages` | 提交 `f46865ba6` 上通过；后续 Diff 小修由精确 SHA 的 CI 完成生产构建                                                                                          |
| GitHub Actions                 | Run [39754337878](https://github.com/mysStack/console/actions/runs/39754337878)，单元测试和镜像构建均通过，Head 为 `288fbccab63bebf76c3677beadc8b00c60c3cfd3` |

浏览器在前一制品上发现并复现了两个真实问题：详情缓存 setter 每次渲染改变导致循环更新，以及首个 Revision 使用空字符串生成了 `diff2html` 无法解析的补丁。提交 `f46865ba6` 和 `288fbccab` 分别修复，并在最终制品上重新执行完整浏览器回归。

## 制品与部署身份

| 项目                  | 实际值                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------- |
| 镜像 tag              | `feature-v4-workloads-20261022-171926-288fbccab63b`                                                   |
| OCI index digest      | `sha256:52ef9ca542462c0404ef8e3ac2f44579c8df8bd3993d0d1c4a5ba6e2e8a44378`                             |
| amd64 manifest digest | `sha256:c68ff7128645e5f347eb00184df0ec2f1675c4da6918bda4ebee00facf1b6886`                             |
| Deployment            | `kubesphere-system/ks-console`，generation `579`，revision `529`，updated/ready `1/1`                 |
| Pod                   | `ks-console-c9767f8f-bvdkg`，`Running` / `Ready`，重启 `0`                                            |
| Pod imageID           | `ghcr.io/mysstack/ks-console@sha256:52ef9ca542462c0404ef8e3ac2f44579c8df8bd3993d0d1c4a5ba6e2e8a44378` |

部署前保存的回滚镜像为 `feature-v4-workloads-20261022-170200-f46865ba6acd@sha256:bb2ce5e3313c0ec0efcb2084b04831770637f7a6cb83e3245460083cff7316db`。最终 rollout 成功，无需回滚。

## Playwright 验证结果

使用全新浏览器会话登录最终制品，未在测试命令、日志、截图或提交中保存测试账号明文。实际结果如下：

| 场景                         | 结果                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Console 登录                 | 通过，登录后进入 `/dashboard`                                                                                           |
| Deployment 项目列表          | 通过；只显示 `v4-migration-e2e` 中的资源，没有出现其他 namespace 的 `watchalert-service`                                |
| StatefulSet / DaemonSet 列表 | 通过；空态、刷新、直达 URL 和浏览器返回可用                                                                             |
| Deployment 详情              | 资源状态、修改记录、元数据、环境变量、配置引用、事件六个路由均可直达并渲染资源名称                                      |
| Revision 稳定性              | 修改记录停留 15 秒，无请求/渲染洪泛，无 React `#185`，无 `Failed to parse lines`                                        |
| V3 可见依赖                  | 上述列表和详情均无可见 iframe；宿主仍保留两个 `display:none`、尺寸为 0 的全局 iframe：`consoleV3Actions` 和 `consolev3` |
| 删除操作                     | 通过原生详情页输入资源名并确认删除；返回 Deployment 列表后显示总数 0，Kubernetes API 回读确认资源不存在                 |
| 测试资源清理                 | 本轮 Deployment、ReplicaSet 和 Pod 已由删除流程清理；保留 `v4-migration-e2e` namespace                                  |

浏览器仍记录到资源状态 Pod Watch WebSocket 的 `403`，页面通过普通查询正常显示 Pod；该问题影响实时更新能力，需在后续 VERIFY 中关闭。131 已安装扩展还会报告接口兼容错误，按项目负责人决定归入后续 Extension 对接，不计入本轮 Workload 代码通过项。

## 当前结论

本轮独立分支、精确 SHA 镜像、131 rollout 和 Playwright 链路已闭环，证明以下范围可继续保留：

- Deployment、StatefulSet、DaemonSet 原生项目列表和项目 namespace 隔离；
- Deployment 原生详情六个现有页签及直达、刷新、返回；
- Deployment 基础创建能力已通过此前同分支浏览器创建资源，并由最终制品完成详情和删除闭环；
- HPA、Revision 和详情缓存的循环请求/渲染缺陷已修复。

Workload 尚未达到模块验收条件。下一项按计划继续补齐 Deployment 探针、资源限制、存储和 ConfigMap/Secret 引用，然后补完整 Action、RBAC、WebSocket 实时更新和 V3 功能逐项等价性；完成 Deployment 后再进入 StatefulSet 和 DaemonSet 创建能力。
