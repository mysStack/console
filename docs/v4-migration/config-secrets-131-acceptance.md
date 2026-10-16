# ConfigMap / Secret 原生列表 131 环境验收记录

> 验收日期：2026-10-16（上海时间）<br>
> 环境：`192.168.2.131:30880`<br>
> 分支：`feature/v4-migration`<br>
> 提交：`ac99e46ae8c9acf5aa69324e1b3f39f46022b647`

## 构建制品

通过 GitHub Actions `Build Personal Console Image` 构建并推送镜像：

- Run：`38842700930`
- Run 地址：<https://github.com/mysStack/console/actions/runs/38842700930>
- 单元测试 Job：通过
- 构建 Job：通过
- 镜像 tag：`feature-v4-migration-20261016-105445-ac99e46ae8c9`
- 镜像：`ghcr.io/mysstack/ks-console:feature-v4-migration-20261016-105445-ac99e46ae8c9`
- 多架构索引 digest：`sha256:33c638626155f093ac7d3ca98d461d39754b04a634601f8f88f221a356ab108e`

## 部署与 Pod 回读

执行 `kubectl set image`、`rollout status` 和 Pod 镜像回读后，rollout 成功，Pod 为 `Running` 且 `1/1`，重启次数为 `0`。

| 项目        | 实际值                                                                                                |
| ----------- | ----------------------------------------------------------------------------------------------------- |
| Pod         | `ks-console-6b445b4f86-lzbsl`                                                                         |
| Node        | `dev01` (`192.168.2.131`)                                                                             |
| Pod IP      | `10.42.0.131`                                                                                         |
| Pod imageID | `ghcr.io/mysstack/ks-console@sha256:33c638626155f093ac7d3ca98d461d39754b04a634601f8f88f221a356ab108e` |

## Playwright 页面验收

使用 Playwright CLI 登录专用测试账号后，访问并检查：

1. 项目 ConfigMap 列表：原生 `ListPage` 表格、项目筛选、名称搜索、创建按钮和真实资源列表正常显示。
2. 项目 Secret 列表：原生 `ListPage` 表格、类型、字段数量、项目筛选和真实资源列表正常显示；列表没有展示 Secret value。
3. ConfigMap 详情：数据、修改记录、元数据、事件四个原生 Tab 可见，真实数据正常显示。
4. Secret 详情：数据、修改记录、元数据、事件四个原生 Tab 可见，详情页面可访问。

截图保存在未提交的本地验收目录：

- `output/playwright/config-secrets-native-131-secrets.png`
- `output/playwright/config-secrets-native-131-configmap-detail.png`
- `output/playwright/config-secrets-native-131-secret-detail.png`

## 未通过或待补项

- 点击 ConfigMap 列表的“创建”按钮后，本次页面未出现创建弹窗；Secret 创建按钮也复用了同一未接入的 `useDisclosure` 入口。创建能力尚未达到 V3 等价，不能把本次结果标记为“已验收”。
- 尚未执行真实创建、编辑、删除、批量删除及权限差异流程。
- 浏览器控制台有扩展模块加载错误（扩展调用 `getExtensionConsoleV3Embed` 等）；这些错误来自已安装扩展，不影响本次列表和详情页面渲染，但需要单独处理。
- 因此迁移矩阵中的 ConfigMap/Secret 状态继续保持“测试中”。
