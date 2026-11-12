# V3 桥接复用与压缩 131 验收记录（2026-10-27）

## 范围

- 分支：`fix/v4-v3-bridge-sync`
- 验收 HEAD：`1763c01680485a11f4d5b3fb5611e3f540e86de7`
- 环境：`192.168.2.131:30881`，项目 `dev-wms`（工作空间 `dev-workspace`，集群 `host`）
- 目标：确认 V3 嵌入列表前缀修复、共享实例复用与 Brotli 压缩三项改动在部署制品上的行为

## 制品

| 项                 | 值                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| GitHub Actions Run | `40481646685`                                                                                         |
| 镜像标签           | `fix-v4-v3-bridge-sync-20261027-173415-1763c0168048`                                                  |
| Deployment         | `kubesphere-system/ks-console-v415-rea`，generation 9                                                 |
| Pod                | `ks-console-v415-rea-fbd5448b7-w6dl9`                                                                 |
| Pod imageID        | `ghcr.io/mysstack/ks-console@sha256:1bf50f4b753f5b25b7d9bb3ae0ee656ff754c565b9474787d7e3fa4a5aae5cec` |
| rollout            | `kubectl rollout status` 成功，1/1 Ready                                                              |

同分支相邻制品：`40477389119` / `fix-v4-v3-bridge-sync-20261027-170150-2dc72b2044ea`（复用修复前的对照）；诊断制品 `40480017251` / `520f30bc0` 仅用于定位，未保留代码。

## 改动与依据

`1763c0168` 复用 V3 实例时记录激活修订。

诊断结论：首次挂载的作用域只触发 Wujie `activated`，不触发 `afterMount`，`mountedRevisions` 因此没有该作用域记录；返回列表时被判为修订不一致，执行 `destroyApp` 重建。131 实测 `/pods` 与 `/services` 首次互切各重建一次，单次 `beforeMount` 出现在点击后 422～528 ms，列表行在约 2.2～3.4 s 才可见。

修复：`activated` 回调同样写入 `mountedResourceUrls` 与 `mountedRevisions`；缓存过期与资源变更两条重建判定保持不变。回归用例见 `packages/console/src/components/ConsoleV3ResourceList/index.test.ts`。

## 部署后测量

Playwright 1.63.0 headless Chromium 1440x900，使用环境变量测试账号新建登录。

| 场景                  | 修复前                                                                  | 修复后                               | 说明                             |
| --------------------- | ----------------------------------------------------------------------- | ------------------------------------ | -------------------------------- |
| `/pods` 冷加载        | 6867～8981 ms                                                           | 5314 ms                              | 含首次登录后 V3 应用启动，波动大 |
| `/pods` → `/services` | 2458 ms（`3ed106a14` 提交记录基线）/ 551～561 ms（`2dc72b2044ea` 制品） | 551 ms                               | 首次跨资源切换                   |
| `/services` → `/pods` | 2867～3411 ms，2～3 个长任务共 190～275 ms                              | 524 ms，0 个长任务                   | 本次主要收益                     |
| `/pods` → `/volumes`  | 40 ms 激活                                                              | 44 ms 激活                           | 空状态页，无表格行               |
| 连续互切              | 首次互切各重建一次                                                      | 全部为 `activated`，无 `beforeMount` | 6 次切换均命中复用               |

修复后 6 次切换的 `activated` 标记时间：82、39、44、39、44、38 ms。

## 路由与内容核对

- `/pods` 11 行、`/services` 7 行、`/jobs` 7 行，与命名空间实际资源一致。
- `/workloads`、`/ingresses`、`/volumes` 正常渲染；`/ingresses` 与 `/volumes` 显示空状态，`kubectl -n dev-wms get pvc` 确认无 PVC，空状态符合实际。
- 从 `/pods` 点击 Pod 进入 `/pods/<name>/resource-status` 详情可渲染，属性卡与操作按钮正常；页面布局与 30880 同一 URL 一致，属既有表现，不在本次改动范围。
- 控制台仍存在扩展初始化报错（`getExtensionConsoleV3Embed is not a function`、`getStoreWithQueryHooks` 等），改动前即存在，未影响列表渲染。

## 压缩

同一制品下对首个 V3 主包 `/dist/v3dist/main.558f452048e49db23323.js` 用原始 HTTP 请求测量：

| Accept-Encoding           | 响应编码 | 传输字节           |
| ------------------------- | -------- | ------------------ |
| `br`                      | br       | 400360             |
| `gzip`                    | gzip     | 614505             |
| `gzip, deflate, br, zstd` | br       | 400360             |
| 未压缩                    | 无       | 2018021（decoded） |

结论：服务端协商正确，`br` 比 `gzip` 少传约 35%。但真实 Chromium 通过明文 HTTP 访问 30881 时只声明 gzip，页面资源 `encodedBodySize` 为 614505，即浏览器实际仍走 gzip。Brotli 只有在客户端声明 `br` 或经 HTTPS 部署时才生效；`follow=true` 纯文本流不压缩的规则由 `ctx.compress = false` 保留。

## 未验证

- 资源变更（创建/删除）后返回列表的重建路径：仅有单元测试覆盖，本轮未在浏览器触发真实变更。
- HTTPS 下浏览器 Brotli 协商，以及压缩改动的实际首屏收益。
- 集群级 V3 嵌入页（`clusters/.../workload/*/Embed.tsx`）与扩展嵌入页的复用表现。
- 其他命名空间、其他集群、非 admin 用户与 RBAC 场景。
- StatefulSet、DaemonSet 直接路由（本项目菜单无对应入口，`/statefulsets`、`/daemonsets` 直连可打开但未逐页核对内容）。

## 复现命令

```sh
sh scripts/test.sh
gh workflow run build-personal-images.yml --ref fix/v4-v3-bridge-sync \
  -f source_ref=fix/v4-v3-bridge-sync
kubectl -n kubesphere-system set image deploy/ks-console-v415-rea \
  ks-console=ghcr.io/mysstack/ks-console:fix-v4-v3-bridge-sync-20261027-173415-1763c0168048
kubectl -n kubesphere-system rollout status deploy/ks-console-v415-rea
kubectl -n kubesphere-system get pod -l app=ks-console-v415-rea \
  -o custom-columns=POD:.metadata.name,IMAGE:.status.containerStatuses[0].imageID
```

浏览器探针保存在 `/tmp/ks-measure/probe55.cjs`、`probe64.cjs`、`probe66.cjs`、`probe67.cjs`，未提交到仓库。
