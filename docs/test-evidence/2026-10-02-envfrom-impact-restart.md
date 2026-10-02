# 配置引用与选择性重启验收记录

## 本次已验证

- V3 focused Jest：4 个 suite、13 个 test 全部通过。
- V3 生产构建：`NODE_OPTIONS=--openssl-legacy-provider V3_PUBLIC_PATH=/dist/v3dist/ corepack yarn build:client` 退出码为 0。
- V3 `manifest.json`：49 个引用，缺失文件 0 个；产物包含 `CONFIG_REFERENCE_IMPACT_CHECKING` 和 `kubesphere.io/restartedAt`。
- Console 生产构建：`NODE_OPTIONS=--openssl-legacy-provider corepack yarn build:prod` 退出码为 0。构建仍有仓库已有的 `REPOSITORY_SYNC_COMPLETED_EVENT` 导出警告和资源体积警告。
- GitHub Actions：`https://github.com/mysStack/console/actions/runs/36971362920` 成功。
- 测试镜像：`docker.io/mingys/ks-console:oci-repo-20261002-812d0e5`。
- 192.168.2.131：`ks-console` 已滚动更新，Pod `1/1 Ready`、重启次数 0。
- 集群内静态验证：`/dist/v3dist/manifest.json` HTTP 200；49 个 manifest 引用均可在制品目录找到；中文 locale 和重启注解字符串可下载。
- Playwright 登录后打开 `dev-wes/wes-v2-server/edit`：完整 V3 编辑页正常渲染，原有 33 个环境变量行仍在；`配置/密钥引用（envFrom）` 作为同级区域显示，点击“添加引用”后成功加载 ConfigMap 列表（包括 `ewms-postgres-wes-config` 等），未展示 Secret 值。

## 真实环境端到端验收（2026-10-02）

在已存在且属于 `dev-workspace` 的 `dev-wes` 命名空间创建临时 ConfigMap、Secret 和 Deployment；测试结束后已删除全部临时资源。

1. Playwright 登录测试环境后打开 ConfigMap 编辑页面，使用“编辑设置”将临时 ConfigMap 从 `before` 改为 `after2`。保存后弹出引用影响对话框，列出 `codex-envfrom-e2e` Deployment。
2. 点击“仅保存”后，ConfigMap 值已更新；Deployment Pod UID 保持 `2b37706a-f255-4867-a9b6-3aacda238df1`，且没有 `kubesphere.io/restartedAt` 注解，证明仅保存不会触发重启。
3. 再次通过同一 UI 将值改为 `after3`，保存后勾选 Deployment 并点击“保存并重启所选”。命令行确认 rollout 成功，注解为 `2026-10-02T08:15:40.324Z`，新 Pod UID 为 `0150ab9a-cc14-4718-a0a7-ac46b4489b1b`，证明只重启所选工作负载。
4. Secret 页面可正常打开编辑设置；引用影响逻辑和 Secret 更新入口均已接入。Secret 的敏感值未写入本记录；影响对话框只显示资源名和工作负载摘要。
5. 测试资源已清理：`codex-envfrom-e2e` Deployment、ConfigMap 和 `codex-envfrom-e2e-secret` Secret 均确认 NotFound。

浏览器控制台仍有测试环境已有的扩展/监控 404 与非目标模块 warning，但不影响上述 ConfigMap 引用发现、仅保存和选择性重启流程。
