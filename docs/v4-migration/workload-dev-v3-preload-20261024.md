# Workload DEV 增量：原生路由跳过 V3 预加载（2026-10-24）

## 变更范围

- 代码提交：`fbf84fa223b43c8b48ac407fbcf4c35a0580f2ab`。
- 变更文件：`packages/core/src/utils/wujie.ts`、`packages/core/src/utils/wujieNativePreload.ts`、`packages/core/src/utils/wujieNativePreload.test.ts`。
- 根因：共享启动层无条件调用两个 `preloadApp()`，使原生 Deployment、StatefulSet、DaemonSet 路由仍请求 `/consolev3` 和 `/dist/v3dist`。
- 修复：新增纯路由判断；原生 Workload 路径跳过预加载，其他路径保留原有 V3 按需注册和预加载行为。该修复不删除旧 V3 入口，旧入口的完整退出仍属于全局迁移收尾。

## DEV 验证

- `./node_modules/.bin/esno packages/core/src/utils/wujieNativePreload.test.ts`：2/2 通过，覆盖三类原生路径和旧路径保留预加载。
- `./scripts/test.sh`：90 个测试文件、402 项通过、0 失败。
- `corepack yarn build:packages`：通过；仅保留既有循环依赖和 Node 模块类型警告。
- `git diff --check`：通过。
- CI Build Personal Console Image Run `40018472891`：Unit tests、Build and publish ks-console 均成功；精确检出 `fbf84fa223b43c8b48ac407fbcf4c35a0580f2ab`。

## 阶段结论

本次 DEV 代码与本地/CI 检查完成，进入 VERIFY。部署前仍必须执行模块门禁 `deploy --tag`，并用该 Run 生成的精确镜像在 131 完成 rollout、Pod Ready/imageID 和零初始 Cookie 浏览器 Network 验收。
