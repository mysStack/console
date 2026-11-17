# 监控插件兼容修复（尚未完成部署验收）

分支：`fix/release-4.1.5-monitoring-sdk-20261117`，基于 30881 已部署的 `9ce26932e`。

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
- 隔离代理运行仓库真实静态中间件，静态 Service 通过只读端口转发访问。集群内 DNS、正式镜像、受限用户、告警编辑以及本次候选的完整 Deployment 路径尚未完成验收。

## 仍然阻塞

1. 平台监控服务 Installed/enabled，但 host 代理为 InstallFailed，失败记录为 etcd endpoint Secret 生成任务 BackoffLimitExceeded。没有伪造代理成功状态。
2. 告警组件 Installed/enabled，但没有集群调度状态，实际告警 API 返回 404，需继续核对后端代理和服务。
3. 授权 API `/kapis/license.kubesphere.io/v1alpha1/licenses` 返回 404。插件默认索引将没有可用子项的根节点名称当作地址，导航到 `/whizard-telemetry/whizardTelemetry`，再由旧页面返回 dashboard。当前没有绕过插件授权判定；默认入口仍未通过验收。
4. Windows 与 WSL 随后同时无法连接 192.168.2.131 的 30881/6443，GitHub 仍可达。不能部署已知功能验收未通过的候选镜像。

其他插件 kubeeye/nodegroup/openkruise 的初始化错误在基线已存在，本次未扩展处理。

证据在 Windows 工作区 `diagnostics/2026-11-17/monitoring-menu/`：`dependency-audit.json`、`module-status.json`、`root-navigation.json`、`candidate-action.json`、`candidate-final-smoke.json`、`unit-tests-final.log`、`server-tests.log`、`build-final.log`。

当前 30881 保持原镜像 `ghcr.io:443/mysstack/ks-console@sha256:deb31b06738eca1f827745ed6458db7b1097b60ee74818e5372859fa492b20e9`。本次未部署、未改后端安装配置、未创建集群业务测试资源。权限和业务验收没有完成，不能报告监控已恢复。
