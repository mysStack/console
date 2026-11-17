# 原有监控入口恢复

恢复 30881 原有集群与项目监控菜单，包含用户给出的 `/dev-workspace/clusters/host/projects/dev-rms/custom-monitoring`。

## 改动范围

根据用户纠正，已撤回 `35f6e425b` 中整批插件 SDK 兼容、静态代理、全局导航和插件路由等待改动。最终修改以部署基线 `9ce26932e` 为对照，保留默认菜单、基础监控组件安装与启用条件，以及对应测试。

- 复用原有集群监控、应用资源、告警、规则组和自定义监控页面。
- 恢复项目告警、规则组与自定义监控菜单。
- 监控与告警分别检查相应组件已安装并启用，首次安装未成功、禁用或卸载时隐藏入口。
- 已安装的平台基础监控服务在主集群可访问，原有代理调度状态保留。成员集群继续检查部署状态。
- 保留资源访问权限检查。

## 验证

实时远程 `release/v4.1.4` 为 `28c5ba7a301b9c11809c52bdcf6e28143b488ff4`。原有基础页面和路由保留，整个内置 `v3dist` 与部署基线相同。

新增回归先观察失败，再验证恢复。覆盖主集群、成员集群、组件首次安装失败、禁用与卸载、残留安装状态和普通用户权限。

用户环境的 `whizard-monitoring` 为 Installed/enabled，版本 1.2.2，`whizard-alerting` 为 Installed/enabled，版本 1.0.3。项目仪表板 API 返回 200。前一个较大候选通过本地菜单点击读取现有 qa 面板，Deployment 流程也通过。这些结果需要在本次精简版本重新验证。

精简版本已执行 `sh scripts/test.sh`，87 文件、367 项通过。工作流服务端回归 98 项通过，production 隔离构建成功。候选正式镜像及 30881 均已 rollout 成功，真实浏览器从项目菜单进入自定义监控并读取现有 qa 面板，仪表板 API 返回 200。Deployment 列表、详情、编辑弹窗取消、五轮进出详情、详情直达及刷新通过。

组件禁用后的菜单隐藏通过真实页面中的权限函数进行浏览器状态模拟验证，安装失败、禁用、卸载与残留状态由单测覆盖。实机使用管理员验收，受限权限通过测试用例覆盖。

## 部署与现有问题

镜像源码为 `ec147abd7836856802225ea54fba469b70ca7ee3`，Actions 为 https://github.com/mysStack/console/actions/runs/44045064566 。

30881 部署镜像为 `ghcr.nju.edu.cn/mysstack/ks-console@sha256:53590476da8c1a2dfcb455c49b9971f7f53223eed5aea213aba580dbef51cd01`。实际 Pod 为 `ks-console-v415-rea-5454f6dcb5-qcwgr`，Ready，实际 imageID 为 `ghcr.io:443/mysstack/ks-console@sha256:53590476da8c1a2dfcb455c49b9971f7f53223eed5aea213aba580dbef51cd01`。

节点 Docker Hub 代理域名解析失败，GHCR 直连拉取超时。通过节点上的现有控制台容器验证南京大学 GHCR 代理返回的 manifest 内容哈希与 Actions 制品一致后，使用该代理完成部署。临时候选 Deployment/Service `ks-console-monitoring-20261117`（31267）已核验 UID 后清理。

原有独立插件的 SDK 不匹配错误保留为后续兼容问题。本次通过内置基础页面恢复原有入口。告警服务还有 handler.go:301/462 下游资源不存在的 404，需要单独排查。

此前的 etcd 采集配置提案已撤回，监控安装配置未修改。
