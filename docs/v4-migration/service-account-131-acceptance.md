# ServiceAccount 原生迁移 131 部署记录

> 日期：2026-10-16（上海时间）<br>
> 环境：`192.168.2.131:30880`<br>
> 分支：`feature/v4-migration`<br>
> 提交：`02df82f09db3d7d2e92559141dea5cd0c2ee4094`

## 本地实现和构建

- 项目 ServiceAccount 列表改为复用原生 `ListPage` 和 `serviceAccountStore`。
- 集群 ServiceAccount 列表路由切换为原生实现。
- 项目 ServiceAccount 详情从 Wujie V3 改为原生 `DetailPage`，复用 Secret 数据详情和角色修改弹窗。
- 新增原生 ServiceAccount 创建弹窗，包含名称和项目选择，并接入创建 mutation。
- 删除不再使用的 `ServiceAccounts/Embed.tsx`。
- 相关测试、ESLint、Prettier 和 `git diff --check` 已通过；GitHub Actions Unit tests 和构建 Job 均通过。

## 构建制品

- Run：`38851180485`
- Run 地址：<https://github.com/mysStack/console/actions/runs/38851180485>
- 镜像 tag：`feature-v4-migration-20261016-123351-02df82f09db3`
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-123351-02df82f09db3`
- 多架构索引 digest：`sha256:a7c4ad551264223deceb68dcfc0814f1884f4288544405ddf60a4a76b1d2ad70`

## 131 部署结果

执行了 `kubectl set image` 和 `kubectl rollout status`。新 Pod
`ks-console-69456775d9-p4x8c` 以及重试 Pod `ks-console-69456775d9-wcfw6` 均长时间停留在
`Pending/ContainerCreating`，事件只有节点开始拉取镜像的记录，没有进入 `Running`，也没有可回读的 imageID。

为保持测试环境可用，已回滚到上一轮已验证制品：

- 当前 Pod：`ks-console-bd75c476b-6h8v9`
- 当前镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-113500-28a1635b3fb1`
- 当前 Pod imageID：`ghcr.io/mysstack/ks-console@sha256:e7a9e8ab4b341ba1eba04c86d4436ddc4a27776226dee3618a71d896f3230c21`
- 当前状态：rollout 成功，Pod `Running`，重启次数 `0`

## 尚未完成

由于 ServiceAccount 新制品没有在 131 上成功启动，尚未进行该制品的 Playwright 验收，也没有标记为“已验收”。待节点恢复镜像拉取后，需重新部署并验证列表、详情、创建弹窗、角色修改、删除及权限流程。
