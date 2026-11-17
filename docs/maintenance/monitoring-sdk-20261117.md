# 监控插件兼容修复（尚未完成部署验收）

分支：`fix/release-4.1.5-monitoring-sdk-20261117`，基于 30881 已部署的 `9ce26932e`。

## 原有入口恢复进展

实时远程 `release/v4.1.4` 为 `28c5ba7a301b9c11809c52bdcf6e28143b488ff4`。已通过 `git show`、`git diff` 和 Git tree 对照确认，原有集群监控和告警路由保留，整个内置 `v3dist` 与当前 HEAD 完全相同。集群与项目的监控菜单均配置为空数组，依赖插件注册。当前插件还漏掉项目自定义监控入口。

本次恢复默认集群监控、应用资源、告警、规则组、自定义监控及项目监控菜单，复用原有路径。主集群已启用的 `whizard-monitoring`、`whizard-alerting` 支持从平台服务判断可访问性，保留原始集群调度状态。成员集群及其他插件继续使用原来的集群条件，所有菜单继续检查原有访问权限。

用户补充的实际页面为 `/dev-workspace/clusters/host/projects/dev-rms/custom-monitoring`。已通过真实登录确认项目仪表板接口 `/clusters/host/kapis/monitoring.kubesphere.io/v1alpha1/namespaces/dev-rms/dashboards` 返回 200。浏览器验收从项目概览展开“监控告警”并点击“自定义监控”，检查原页面控制和接口响应。

本次回归执行 `sh scripts/test.sh`，92 文件、378 项通过。工作流中的服务端回归命令执行后 97 项通过。新增菜单回归已观察修复前失败，覆盖主集群启用、成员集群隔离、卸载隐藏、普通权限过滤和项目自定义监控。production 隔离构建成功，原有 dist 保留。

本地浏览器通过隔离构建和当前源码的默认菜单进行验证，配置注入只用于本地预览。正式验收仍需检查构建镜像中实际生成的菜单配置，以及最终 Pod imageID。之前的临时候选服务为 31267，最近查询仍处于拉取镜像阶段，30881 尚未更新。

## 故障与代码范围

- `whizard-telemetry` 脚本 HTTP 200，但 SDK 缺少七个导出而初始化失败；30880 同样复现。旧验收仅比较菜单，遗漏了共同存在的功能故障。
- 补充 `getExtensionConsoleV3Embed`、`ConfigConstants`、`CollapseContainer`、`CollapsedBtn`、`TableHead`、`WizTelemetry`、`unitToNumber`。工厂按真实插件 manifest 构造页面，使用独立事件空间，页面/动作按需启动；登录不下载插件 V3，核心 V3 保留原生单实例。
- 插件 V3 会再次解码宿主已经解析过的注解，现使用隔离副本重新编码，不修改宿主对象。
- 插件静态 ReverseProxy 标记为 `kubesphere.io/reverse-proxy-target=ks-console`，API Server 故意排除该规则，单纯转发到 API Server 得到 403/404。新增静态中间件从注册表解析控制台目标路由，仅处理已认证 GET/HEAD；短时缓存按会话隔离，不向上游转发 Cookie/Authorization/Referer，不近似处理不支持的 rewrite/header 指令。
- 平台可观测入口从实际子页面判断访问权限，保留显式入口权限；插件注册完成前暂缓同名内置旧页面，其他内置页面照常可用。

## 实际执行与结果

- `sh scripts/test.sh`：91 文件，374 项通过，0 失败。
- `.github/workflows/build-personal-images.yml` 列出的服务端回归（新增 `server/extensionStaticProxy.test.js`）：97 项通过，0 失败。
- 正式 production 配置隔离构建成功，输出到 `/home/bruce/.cache/ks-console-diagnostics/monitoring-sdk-20261117-*`，未覆盖源码 dist。
- 管理员真实登录候选：监控插件初始化错误消失；可观测入口进入权限列表；集群监控显示 CPU/内存/磁盘/容器组数据；告警创建弹窗打开后可取消，无告警写入。登录不下载插件 V3。
- 隔离代理运行仓库真实静态中间件，静态 Service 通过只读端口转发访问。完整 Deployment 路径的本地浏览器回归已通过。正式镜像、受限用户及告警编辑尚未完成验收。

## 仍然阻塞

1. 平台监控服务 Installed/enabled，host 代理记录为 InstallFailed，失败记录为 etcd endpoint Secret 生成任务 BackoffLimitExceeded。实际监控 API 返回 200。关闭 etcd 采集的提案已撤回，未应用任何监控安装配置变更。
2. 告警组件 Installed/enabled，集群规则 CRD 接口返回 200，实际告警服务接口仍返回 404。已经确认请求到达告警服务，服务日志报告 handler.go:301/462 的下游资源不存在，后端问题仍待验证。
3. 授权 API `/kapis/license.kubesphere.io/v1alpha1/licenses` 返回 404。插件默认索引将没有可用子项的根节点名称当作地址，导航到 `/whizard-telemetry/whizardTelemetry`，再由旧页面返回 dashboard。当前没有绕过插件授权判定；默认入口仍未通过验收。
4. 之前网络中断已恢复。SDK 修复的 Actions 构建成功，临时候选已创建，尚待镜像拉取和真实镜像浏览器验收。

其他插件 kubeeye/nodegroup/openkruise 的初始化错误在基线已存在，本次未扩展处理。

证据在 Windows 工作区 `diagnostics/2026-11-17/monitoring-menu/`：`dependency-audit.json`、`module-status.json`、`root-navigation.json`、`candidate-action.json`、`candidate-final-smoke.json`、`unit-tests-final.log`、`server-tests.log`、`build-final.log`。

当前 30881 保持原镜像 `ghcr.io:443/mysstack/ks-console@sha256:deb31b06738eca1f827745ed6458db7b1097b60ee74818e5372859fa492b20e9`。临时 Deployment/Service 为 `ks-console-monitoring-20261117`。未修改后端安装配置，未创建集群业务测试资源。正式部署验收仍在进行。
