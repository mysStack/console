# V3 嵌入点盘点（console release-4.1.5）

- 生成方式：扫描 `packages/{console,shared}/src/**/*.tsx` 中 `<ConsoleV3ResourceList` 与 `<WujieReact name="consolev3">`
- 合计 **138** 个页面：保活 26，非保活 112
- `宿主可解` 依据 2026-10-28 的 REA 结论（R1–R8，见下），`需要做` 为业务判断，全部标 `待定`，需负责人填写

## REA 结论索引

- **R1** preloadApp + alive 只激活不挂载，冷启动空页
- **R2** 非保活嵌入卸载清空共享 ShadowRoot
- **R3** 旧模板空壳遮挡整屏
- **R4** V3 路由只用 replaceState，宿主需补 popstate
- **R5** destroy() 不 await unmount()，head 置空竞态
- **R6** V3 列表 30 s 时间缓存强制重建
- **R7** 切换项目时 V3 项目布局重引导约 2.3 s（V3 内部）
- **R8** 138 个嵌入点共用同一个 sandbox

## 清单

| # | 页面 | 上下文 | 嵌入方式 | 资源 | V3 子路径 | 宿主可解（能做） | 证据级别 | 关联 REA | 需要做（业务） |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `console/src/pages/projects/containers/Alerting/Messages/index.tsx` | 项目 | 保活(alive) | alerts | `{prefix}/alerts` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 2 | `console/src/pages/projects/containers/Alerting/Policies/index.tsx` | 项目 | 保活(alive) | alert-rules | `{prefix}/alert-rules` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 3 | `console/src/pages/projects/containers/ApplicationComposing/Embed.tsx` | 项目 | 保活(alive) | composing | `{prefix}/composing` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 4 | `console/src/pages/projects/containers/ConfigMaps/index.tsx` | 项目 | 保活(alive) | configmaps | `{prefix}/configmaps` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 5 | `console/src/pages/projects/containers/CronJobs/index.tsx` | 项目 | 保活(alive) | cronjobs | `{prefix}/cronjobs` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 6 | `console/src/pages/projects/containers/DaemonSets/index.tsx` | 项目 | 保活(alive) | daemonsets | `{prefix}/daemonsets` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 7 | `console/src/pages/projects/containers/Deployments/index.tsx` | 项目 | 保活(alive) | deployments | `{prefix}/deployments` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 8 | `console/src/pages/projects/containers/Gateway/index.tsx` | 项目 | 保活(alive) | gateways | `{prefix}/gateways` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 9 | `console/src/pages/projects/containers/GrayRelease/index.tsx` | 项目 | 保活(alive) | grayrelease | `{prefix}/grayrelease` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 10 | `console/src/pages/projects/containers/ImageBuilder/index.tsx` | 项目 | 保活(alive) | s2ibuilders | `{prefix}/s2ibuilders` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 11 | `console/src/pages/projects/containers/Jobs/index.tsx` | 项目 | 保活(alive) | jobs | `{prefix}/jobs` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 12 | `console/src/pages/projects/containers/LogCollection/index.tsx` | 项目 | 保活(alive) | log-collections | `{prefix}/log-collections` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 13 | `console/src/pages/projects/containers/Network/Policies/index.tsx` | 项目 | 保活(alive) | networkpolicies | `{prefix}/networkpolicies` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 14 | `console/src/pages/projects/containers/Pods/index.tsx` | 项目 | 保活(alive) | pods | `{prefix}/pods` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 15 | `console/src/pages/projects/containers/Roles/index.tsx` | 项目 | 保活(alive) | roles | `{prefix}/roles` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 16 | `console/src/pages/projects/containers/Routes/index.tsx` | 项目 | 保活(alive) | ingresses | `{prefix}/ingresses` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 17 | `console/src/pages/projects/containers/Secrets/index.tsx` | 项目 | 保活(alive) | secrets | `{prefix}/secrets` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 18 | `console/src/pages/projects/containers/ServiceAccounts/index.tsx` | 项目 | 保活(alive) | serviceaccounts | `{prefix}/serviceaccounts` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 19 | `console/src/pages/projects/containers/Services/index.tsx` | 项目 | 保活(alive) | services | `{prefix}/services` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 20 | `console/src/pages/projects/containers/SpringCloud/configurations/index.tsx` | 项目 | 保活(alive) | configurations | `{prefix}/configurations` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 21 | `console/src/pages/projects/containers/SpringCloud/microservicegateways/index.tsx` | 项目 | 保活(alive) | microservicegateways | `{prefix}/microservicegateways` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 22 | `console/src/pages/projects/containers/SpringCloud/microservices/index.tsx` | 项目 | 保活(alive) | microservices | `{prefix}/microservices` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 23 | `console/src/pages/projects/containers/SpringCloud/servicerouting/index.tsx` | 项目 | 保活(alive) | servicerouting | `{prefix}/servicerouting` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 24 | `console/src/pages/projects/containers/StatefulSets/index.tsx` | 项目 | 保活(alive) | statefulsets | `{prefix}/statefulsets` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 25 | `console/src/pages/projects/containers/VolumeSnapshots/index.tsx` | 项目 | 保活(alive) | volume-snapshots | `{prefix}/volume-snapshots` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 26 | `console/src/pages/projects/containers/Volumes/index.tsx` | 项目 | 保活(alive) | volumes | `{prefix}/volumes` | 是（宿主桥接可解 R1–R6；R7 属 V3 内部未解） | 已部署实测（probe81/88/95/97/100/101/104/105） | R1,R2,R3,R4,R5,R6,R7 | 待定 |
| 27 | `console/src/pages/devops/embed.tsx` | DevOps | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 28 | `console/src/actions/v3actions.tsx` | 其它 | 非保活(raw) | consolev3 | `//${window.location.host}/consolev3/` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 29 | `console/src/pages/whizard-telemetry/embed.tsx` | 可观测插件 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 30 | `console/src/pages/workspaces/containers/FedProjects/index.tsx` | 工作空间 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 31 | `console/src/pages/workspaces/containers/Gateway/Detail/index.tsx` | 工作空间 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 32 | `console/src/pages/workspaces/containers/Gateway/embed.tsx` | 工作空间 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 33 | `console/src/pages/workspaces/containers/Groups/index.tsx` | 工作空间 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 34 | `console/src/pages/workspaces/containers/Overview/Clusters/embed.tsx` | 工作空间 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 35 | `console/src/pages/workspaces/containers/QuotaManage/Embed.tsx` | 工作空间 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 36 | `console/src/pages/platform/containers/History/index.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 37 | `console/src/pages/platform/containers/NotificationConfiguration/embed.tsx` | 平台 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 38 | `console/src/pages/platform/containers/NotificationLanguage/index.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 39 | `console/src/pages/platform/containers/SilentPolicy/Detail/Embed.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 40 | `console/src/pages/platform/containers/SilentPolicy/index.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 41 | `console/src/pages/platform/containers/Subscription/Detail/edit.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 42 | `console/src/pages/platform/containers/Subscription/Detail/index.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 43 | `console/src/pages/platform/containers/Subscription/create.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 44 | `console/src/pages/platform/containers/Subscription/index.tsx` | 平台 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 45 | `console/src/pages/fedprojects/containers/Application/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 46 | `console/src/pages/fedprojects/containers/Application/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 47 | `console/src/pages/fedprojects/containers/BaseInfo/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 48 | `console/src/pages/fedprojects/containers/ConfigMaps/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 49 | `console/src/pages/fedprojects/containers/ConfigMaps/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 50 | `console/src/pages/fedprojects/containers/Deployments/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 51 | `console/src/pages/fedprojects/containers/Deployments/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 52 | `console/src/pages/fedprojects/containers/Gateway/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 53 | `console/src/pages/fedprojects/containers/Gateway/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 54 | `console/src/pages/fedprojects/containers/LogCollection/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 55 | `console/src/pages/fedprojects/containers/Overview/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 56 | `console/src/pages/fedprojects/containers/QuotaManage/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 57 | `console/src/pages/fedprojects/containers/Routes/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 58 | `console/src/pages/fedprojects/containers/Routes/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 59 | `console/src/pages/fedprojects/containers/Secrets/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 60 | `console/src/pages/fedprojects/containers/Secrets/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 61 | `console/src/pages/fedprojects/containers/Services/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 62 | `console/src/pages/fedprojects/containers/Services/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 63 | `console/src/pages/fedprojects/containers/StatefulSets/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 64 | `console/src/pages/fedprojects/containers/StatefulSets/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 65 | `console/src/pages/fedprojects/containers/Volumes/Detail/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 66 | `console/src/pages/fedprojects/containers/Volumes/index.tsx` | 联邦项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 67 | `console/src/pages/clusters/containers/Alerting/Embed/index.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 68 | `console/src/pages/clusters/containers/ApplicationWorkloads/Jobs/Embed/index.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 69 | `console/src/pages/clusters/containers/ApplicationWorkloads/RoutersSetting/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 70 | `console/src/pages/clusters/containers/ApplicationWorkloads/Routes/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 71 | `console/src/pages/clusters/containers/ApplicationWorkloads/Routes/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 72 | `console/src/pages/clusters/containers/ApplicationWorkloads/Services/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 73 | `console/src/pages/clusters/containers/ApplicationWorkloads/Services/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 74 | `console/src/pages/clusters/containers/ClusterSetting/EmbedGateway/Detail/index.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 75 | `console/src/pages/clusters/containers/ClusterSetting/EmbedGateway/embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 76 | `console/src/pages/clusters/containers/ClusterSetting/LogCollection/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 77 | `console/src/pages/clusters/containers/ClusterSetting/LogCollection/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 78 | `console/src/pages/clusters/containers/Clusters/ClusterTags/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 79 | `console/src/pages/clusters/containers/Clusters/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 80 | `console/src/pages/clusters/containers/Configuration/Configmaps/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 81 | `console/src/pages/clusters/containers/Configuration/Secrets/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 82 | `console/src/pages/clusters/containers/Configuration/ServiceAccounts/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 83 | `console/src/pages/clusters/containers/KubeEdge/Detail/index.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 84 | `console/src/pages/clusters/containers/KubeEdge/index.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 85 | `console/src/pages/clusters/containers/Monitor/CustomMonitoring/index.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 86 | `console/src/pages/clusters/containers/Network/IPPools/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 87 | `console/src/pages/clusters/containers/Network/IPPools/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 88 | `console/src/pages/clusters/containers/Network/Policies/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 89 | `console/src/pages/clusters/containers/Network/Policies/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 90 | `console/src/pages/clusters/containers/Overview/embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 91 | `console/src/pages/clusters/containers/Projects/detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 92 | `console/src/pages/clusters/containers/Projects/detail/Gateway/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 93 | `console/src/pages/clusters/containers/Storage/StorageClasses/Embed/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 94 | `console/src/pages/clusters/containers/Storage/StorageClasses/Embed/detail.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 95 | `console/src/pages/clusters/containers/Storage/VolumeSnapshotClasses/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 96 | `console/src/pages/clusters/containers/Storage/VolumeSnapshotClasses/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 97 | `console/src/pages/clusters/containers/Storage/VolumeSnapshots/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 98 | `console/src/pages/clusters/containers/Storage/VolumeSnapshots/SnapshotContent/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 99 | `console/src/pages/clusters/containers/Storage/VolumeSnapshots/Snapshots/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 100 | `console/src/pages/clusters/containers/Storage/Volumes/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 101 | `console/src/pages/clusters/containers/Storage/Volumes/PV/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 102 | `console/src/pages/clusters/containers/Storage/Volumes/Volume/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 103 | `console/src/pages/clusters/containers/Workload/CronJobs/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 104 | `console/src/pages/clusters/containers/Workload/DaemonSets/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 105 | `console/src/pages/clusters/containers/Workload/Deployments/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 106 | `console/src/pages/clusters/containers/Workload/Jobs/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 107 | `console/src/pages/clusters/containers/Workload/Pods/ContainerDetail/index.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 108 | `console/src/pages/clusters/containers/Workload/Pods/Detail/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 109 | `console/src/pages/clusters/containers/Workload/Pods/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 110 | `console/src/pages/clusters/containers/Workload/Routes/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 111 | `console/src/pages/clusters/containers/Workload/Services/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 112 | `console/src/pages/clusters/containers/Workload/StatefulSets/Embed.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 113 | `console/src/pages/clusters/containers/Workload/Workloads/Embed/index.tsx` | 集群 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 114 | `console/src/pages/projects/containers/Alerting/Policies/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/alert-rules/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 115 | `console/src/pages/projects/containers/ApplicationComposing/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/composing/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 116 | `console/src/pages/projects/containers/BaseInfo/index.tsx` | 项目 | 非保活(raw) | base-info | `{prefix}/base-info` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 117 | `console/src/pages/projects/containers/CronJobs/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/cronjobs/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 118 | `console/src/pages/projects/containers/CustomMonitoring/index.tsx` | 项目 | 非保活(raw) | custom-monitoring | `{prefix}/custom-monitoring` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 119 | `console/src/pages/projects/containers/DaemonSets/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/daemonsets/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 120 | `console/src/pages/projects/containers/Deployments/Detail/index.tsx` | 项目 | 非保活(raw) | embeddedUrl | `embeddedUrl` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 121 | `console/src/pages/projects/containers/Gateway/Detail/index.tsx` | 项目 | 非保活(raw) | url | `url` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 122 | `console/src/pages/projects/containers/ImageBuilder/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/s2ibuilders/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 123 | `console/src/pages/projects/containers/Jobs/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/jobs/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 124 | `console/src/pages/projects/containers/Overview/index.tsx` | 项目 | 非保活(raw) | url | `url` | 未知（交互/实时页面未验证） | 未逐页验证 | R2,R4,R5,R7,R8 | 待定 |
| 125 | `console/src/pages/projects/containers/Pods/ContainerDetail/index.tsx` | 项目 | 非保活(raw) | ${containerName} | `{prefix}/pods/${podName}/containers/${containerName}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 126 | `console/src/pages/projects/containers/Pods/Detail/index.tsx` | 项目 | 非保活(raw) | ${podName} | `{prefix}/pods/${podName}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 127 | `console/src/pages/projects/containers/Roles/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/roles/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 128 | `console/src/pages/projects/containers/Routes/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/ingresses/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 129 | `console/src/pages/projects/containers/ServiceAccounts/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/serviceAccounts/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 130 | `console/src/pages/projects/containers/Services/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/services/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 131 | `console/src/pages/projects/containers/SpringCloud/configurations/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/configurations/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 132 | `console/src/pages/projects/containers/SpringCloud/microserviceInstances/Detail/index.tsx` | 项目 | 非保活(raw) | ${encodeURIComponent(
        instanceId as string,
      )} | `{prefix}/microservice-instances/${podName}/${encodeURIComponent(
        instanceId as string,
      )}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 133 | `console/src/pages/projects/containers/SpringCloud/microservicegateways/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/microservicegateways/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 134 | `console/src/pages/projects/containers/SpringCloud/microservices/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/microservices/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 135 | `console/src/pages/projects/containers/SpringCloud/servicerouting/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/servicerouting/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 136 | `console/src/pages/projects/containers/StatefulSets/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/statefulsets/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 137 | `console/src/pages/projects/containers/VolumeSnapshots/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/volume-snapshots/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |
| 138 | `console/src/pages/projects/containers/Volumes/Detail/index.tsx` | 项目 | 非保活(raw) | ${name} | `{prefix}/volumes/${name}` | 部分（共享实例侧已修，页面交互未逐页验证） | 未逐页验证 | R2,R4,R5 | 待定 |

## 怎么用这张表（能做 ≠ 需要做）

| | 需要做（影响使用） | 不需要做 |
| --- | --- | --- |
| **能做（宿主可解）** | 直接修桥接层，成本最低，优先做 | 保持现状，不投入 |
| **不能做（必须改 V3 内部）** | 定向 V4 重写，列入迁移范围 | 不处理，记录风险 |
| **未知（未验证）** | 先做一轮验证再定级 | 暂不投入 |

当前状态：26 个保活列表的 R1–R6 已在宿主侧修复并实测；112 个非保活嵌入的共享实例问题已修，
但页面自身交互未逐页验证；`需要做` 需要业务按“使用频率 × 出错后果”填写（建议 A 高频核心 / B 偶尔 / C 基本不用）。

## 统计

| 上下文 | 保活 | 非保活 |
| --- | --- | --- |
| DevOps | 0 | 1 |
| 其它 | 0 | 1 |
| 可观测插件 | 0 | 1 |
| 工作空间 | 0 | 6 |
| 平台 | 0 | 9 |
| 联邦项目 | 0 | 22 |
| 集群 | 0 | 47 |
| 项目 | 26 | 25 |
