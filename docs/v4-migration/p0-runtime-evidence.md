# P0 131 运行时与制品身份证据

> 取证日期：2026-10-17（上海时间）  
> 环境：`192.168.2.131:30880`  
> 当前协调分支：`feature/v4-configmaps-secrets`  
> 当前文档提交：`e2e306f3c5949df09686d9043f84cf3d73552b47`  
> 本地 Evidence ID：`ev_local_p0_runtime_20261017_131_01`

本文记录本轮在已存在的 131 测试环境上的脱敏运行时取证。没有执行镜像构建、Deployment 更新、资源创建或删除，也没有修改共享集群配置。此前 ConfigMap、Secret、ServiceAccount 的真实操作记录仍属于历史先行证据，本文件只补充 P0 的入口和制品身份核对。

## 1. 当前部署身份

通过只读命令回读 `kubesphere-system/ks-console`：

```bash
kubectl -n kubesphere-system get pod ks-console-789d5765fd-dsp5v \
  -o jsonpath='{.status.containerStatuses[0].imageID}{"\n"}{.status.containerStatuses[0].image}{"\n"}{.status.phase}{"/"}{.status.containerStatuses[0].ready}{"\n"}'
```

结果：

| 项目 | 实际值 |
| --- | --- |
| Deployment | `ks-console` |
| Pod | `ks-console-789d5765fd-dsp5v` |
| 镜像 tag | `feature-v4-configmaps-secrets-20261016-170820-277e50781a04` |
| Pod imageID | `ghcr.io/mysstack/ks-console@sha256:04650b2ddbb79dcb19443fafa639cabbb62cb08d8c0087b7a8f850402bd3e018` |
| 状态 | `Running/true` |

当前仓库的 `v3dist` 自 `277e50781a041274ce05473ed59b5ee117ccba75` 到当前协调提交没有变化，Git tree 仍为 `1e499d92e11374e26c76f5e13be45251602bd596`，因此本次浏览器取证使用的已部署制品包含与当前 P0 记录相同的 V3 文件树。该关系不能补齐外部镜像到旧 V3 源码 commit 的 provenance，P0-U001/P0-U004 仍保留。

## 2. 浏览器运行时观察

使用 Playwright CLI 的 `default` 浏览器会话和专用测试账号，未在文档、命令输出或截图中记录账号信息。

### 2.1 项目菜单和原生资源入口

直达：

```text
http://192.168.2.131:30880/test-workspace/clusters/host/projects/test-wes/base-info
```

页面正常渲染，项目侧边栏显示“保密字典”“配置字典”“服务帐户”等入口。项目基本信息页还显示指向 `/consolev3/workspaces/test-workspace` 的历史 Workspace 链接，证明当前菜单和旧 V3 入口仍同时存在于运行时入口图中。

随后直达项目日志收集页面：

```text
http://192.168.2.131:30880/test-workspace/clusters/host/projects/test-wes/log-collections
```

外层 V4 路由正常显示“日志收集”标题；页面内两个 Wujie frame 的 URL 为：

```text
/consolev3/dashboard
/consolev3/test-workspace/clusters/host/projects/test-wes/log-collections
```

对应请求均返回 `200`，V3 CSS、主 JS、locale 和资源 chunk 也均返回 `200`。第二个 frame 的文本包含“日志收集”和“如何收集卷上的日志？”，说明该入口确实加载了 V3 页面，而不是只保留静态 URL 字符串。

### 2.2 直达、刷新和返回

- 直达 `/consolev3/dashboard` 返回 `200` 并加载 V3 主资源，但脱离外层 Wujie 容器时页面 body 为空；这证明静态入口可达，不能证明独立直达页面可用。
- 在项目 `log-collections` 页面执行 `reload` 后，外层 URL 保持不变，两个 Wujie frame 仍分别加载 dashboard 和目标资源路径。
- 从 `base-info` 进入 `log-collections` 后执行浏览器返回，URL 恢复为 `log-collections`，两个 Wujie frame 仍存在。

以上只覆盖代表性项目入口，尚未对静态清单中的所有集群、Workspace、联邦、平台和扩展入口逐项执行直达、刷新、返回。

### 2.3 原生详情 Tab 与 Network

直达一个已有测试 Secret 的详情页：

```text
/test-workspace/clusters/host/projects/test-biz-config/secrets/codex-v4-e2e-secret-edit-20261016-history/detail
```

页面显示原生详情的“数据”“修改记录”“元数据”“事件”四个 Tab。切换到“修改记录”后页面显示历史记录说明，返回详情 URL 成功恢复。请求观察到：

- Secret 列表和详情 API 返回 `200`；
- V3 主资源和 chunk 请求返回 `200`，因为公共外层仍初始化了 Wujie dashboard；
- 一个历史测试名称的不存在版本请求返回 `404`，这是目标资源不存在的错误态证据，不应被当作成功；
- 本轮没有提交表单，也没有新建、编辑或删除资源。

### 2.4 控制台错误和扩展状态

当前页面控制台记录到已安装扩展加载错误，包括 `getExtensionConsoleV3Embed` 未定义、`ConfigConstants` 未定义和 `ingress-utils` store hook 未定义。错误来自扩展初始化，当前代表性项目页面仍能渲染；它们必须保留为 P0-U002-C 的风险证据，不能静默忽略。

只读查询 `extensions.kubesphere.io` 的状态得到：

- `Installed`：`cert-manager`、`frontend-forge`、`gateway`、`ingress-utils`、`ks-autoscaling`、`kubesphere-copilot`、`metrics-server`、`openkruise`、`openpitrix`、`vertical-pod-autoscaler`、`whizard-alerting`、`whizard-monitoring`、`whizard-monitoring-pro`、`whizard-telemetry`、`wiztelemetry-tracing`；
- `InstallFailed`：`kubeeye`；
- 其余已发现扩展对象未处于已安装或失败状态。

浏览器请求 `/kapis/kubesphere.io/v1alpha1/extensions?limit=100&available=true` 返回 `200`，15 个 `Installed` 加 1 个 `InstallFailed`，共有 16 个带状态的扩展对象，与工作台显示“16 已安装组件”一致。计数差异已经解释；但 `kubeeye` 虽为 `InstallFailed`，仍有 `kubeeye-frontend-js-bundle`，且控制台记录了该扩展初始化错误，仍需作为失败扩展风险处理。

## 3. 证据边界和门禁结论

本轮关闭了 P0-U003 的“完全未开始”状态，形成了同一已部署制品上的代表性路由、Wujie frame、刷新/返回、原生 Tab、Network 和扩展错误证据；P0-U002 也从纯静态盘点推进到“部分运行时覆盖”。

仍未关闭：

1. 所有当前启用路由、扩展和动态 Action 的逐项映射；
2. 低权限或不同角色账号下的菜单、直达、API 和错误态对照；
3. 当前 `v3dist` 与外部镜像及旧 V3 源码 commit/tag 的可核验 provenance；
4. 三个独立任务 Agent 的独立复核（启动请求连续受到协作服务 `429 Too Many Requests`）。

因此 P0-REA 仍为“分析中/待门禁复核”，本轮不宣布 P0 通过，不进入 P1-REA、P2-REA 或任何正式功能开发。下一步应由项目负责人或指定复核人根据本文件、静态盘点、REA Evidence 和基线来源证据确认剩余未知项的关闭方式。

