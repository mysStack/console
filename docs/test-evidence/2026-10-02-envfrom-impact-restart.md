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

## 待在浏览器中验收

需要使用有效的测试环境账号完成以下操作并补充截图：

1. 工作负载编辑页同时保留原有 `env` 与新增 `envFrom` 配置引用。
2. 保存 ConfigMap/Secret 后仅列出引用该资源的 Deployment、StatefulSet、DaemonSet、CronJob。
3. 点击“仅保存”不会产生 PodTemplate 重启注解。
4. 选择部分工作负载重启时，仅选中项新增 `kubesphere.io/restartedAt` 并滚动更新。
5. Secret 值不出现在页面、网络响应、日志或截图中。
