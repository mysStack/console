# ConfigMap/Secret 配置引用与 Reloader 集成实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with verification checkpoints.

**目标：** 在不修改或替换完整 V3 制品的前提下，为标准工作负载提供独立的 ConfigMap/Secret `envFrom` 配置入口，并用 Stakater Reloader 负责配置变化后的自动滚动更新。

**架构：** V3 继续作为完整工作负载页面的只读兼容层。Console 增加独立的配置引用模块，只通过 Kubernetes API 读写 `envFrom` 和 Reloader 注解，不接管 V3 创建/编辑路由。Reloader 作为独立 Kubernetes Controller 监听 ConfigMap/Secret，KubeSphere 不实现影响分析、重启队列或自定义重启控制器。

**技术栈：** React 17、TypeScript、现有 Console 路由与 Kubernetes API 客户端、Stakater Reloader、Kubernetes Deployment/StatefulSet/DaemonSet。

**规范：** `docs/designs/2026-10-01-workload-envfrom-console-native-design.md`、`../kubesphere/docs/PLAN.md`。

## 全局约束

- 不修改、重建或替换现有完整 `v3dist` 制品。
- 不把 Console 原生精简工作负载表单设为 V3 创建/编辑页面的替代入口。
- Secret 只读取名称和元数据，不读取、展示或记录 Secret 值。
- `env` 与 `envFrom` 保持 Kubernetes 原生语义，不互相覆盖。
- Reloader 与 KubeSphere 核心 Controller、API 不建立专用耦合。
- 自动重启默认关闭，用户按工作负载显式开启。
- 旧的“影响分析 + 用户选择重启 + 自研 PodTemplate PATCH”方案标记废弃，不再实现。
- 修改使用中文提交信息；完成前不合并 `master` 或官方 `release-4.1`。

---

### 任务 1：固化方案文档和旧方案迁移状态

**文件：**

- 修改：`../kubesphere/docs/PLAN.md`
- 修改：`docs/designs/2026-10-01-workload-envfrom-console-native-design.md`
- 新增：`docs/designs/2026-10-04-config-reference-reloader-design.md`

**接口约束：**

- 计划文档必须把 `envFrom` 编辑、Reloader 注解管理、Reloader 集群部署分成独立任务。
- 旧的影响分析、确认弹窗和自研重启任务保留历史记录，但标记为“已废弃/由 Reloader 替代”。

- [ ] 更新项目计划中的 P0/P1 状态、验收标准和回滚边界。
- [ ] 在设计文档中明确 V3 只读、Console 独立入口、Reloader 独立运行三者边界。
- [ ] 自审文档，确认没有“用户每次确认重启”或“自研影响分析”作为当前目标。
- [ ] 运行 `git diff --check`。

### 任务 2：建立独立配置引用领域模型

**文件：**

- 新增：`packages/console/src/pages/projects/components/ConfigReference/types.ts`
- 新增：`packages/console/src/pages/projects/components/ConfigReference/envFrom.ts`
- 新增：`packages/console/src/pages/projects/components/ConfigReference/reloader.ts`
- 测试：上述文件对应的 `*.test.ts`

**接口：**

```ts
type ConfigReferenceKind = 'configMap' | 'secret';

interface EnvFromReference {
  kind: ConfigReferenceKind;
  name: string;
  prefix?: string;
}

interface ReloaderPolicy {
  enabled: boolean;
}

function parseEnvFrom(source: unknown): EnvFromReference[];
function serializeEnvFrom(rows: EnvFromReference[]): unknown[];
function readReloaderPolicy(annotations: Record<string, string>): ReloaderPolicy;
function writeReloaderPolicy(
  annotations: Record<string, string>,
  enabled: boolean,
): Record<string, string>;
```

- [ ] 先写失败测试，覆盖 ConfigMap、Secret、前缀、空行、重复引用和非法引用。
- [ ] 实现纯转换函数，不读取 Secret 数据。
- [ ] 写 Reloader 注解时只添加或移除 `reloader.stakater.com/auto`，保留其他注解。
- [ ] 运行 Console 对应单元测试和格式检查。

### 任务 3：实现独立配置引用入口

**文件：**

- 新增：`packages/console/src/pages/projects/components/ConfigReference/ConfigReferencePanel.tsx`
- 新增：`packages/console/src/pages/projects/components/ConfigReference/ConfigReferencePage.tsx`
- 新增：`packages/console/src/pages/projects/components/ConfigReference/ConfigReferencePanel.test.tsx`
- 修改：项目工作负载详情路由，增加独立 `config-reference` 子路由
- 修改：对应中英文 locale 文件

**交互：**

```text
工作负载详情页
└── 更多操作 → 配置引用
    ├── ConfigMap 引用列表
    ├── Secret 引用列表
    ├── 前缀
    ├── 自动重启开关
    └── 保存
```

- [ ] 独立面板读取当前 PodTemplate 的 `envFrom`，不改变 V3 创建/编辑路由。
- [ ] 因完整 V3 制品不可维护，第一期入口使用 Console 原生 `.../:name/config-reference` 路由；不在 V3 内注入按钮或替换 V3 详情页。
- [ ] 只展示 ConfigMap/Secret 名称、加载状态、错误状态和重试入口。
- [ ] 保存时只 PATCH 目标容器的 `envFrom` 与工作负载注解，保留其他 PodTemplate 字段。
- [ ] 自动重启关闭时移除 Reloader 注解，开启时写入 `reloader.stakater.com/auto: "true"`。
- [ ] 覆盖 Deployment、StatefulSet、DaemonSet；未支持的资源显示明确提示。
- [ ] 浏览器验证 1280、1440、1920 宽度下无错位和横向溢出。

### 任务 4：提供 Reloader 部署和权限清单

**文件：**

- 新增：`kubesphere/deploy/reloader/namespace.yaml`
- 新增：`kubesphere/deploy/reloader/rbac.yaml`
- 新增：`kubesphere/deploy/reloader/deployment.yaml`
- 新增：`kubesphere/deploy/reloader/kustomization.yaml`
- 新增：`kubesphere/docs/reloader.md`

- [ ] 固定 Reloader 镜像版本，不使用 `latest`。
- [ ] RBAC 只授予 ConfigMap、Secret、Deployment、StatefulSet、DaemonSet 的必要 watch/update 权限。
- [ ] 明确 Reloader 是可选组件，卸载后工作负载配置保留，只停止自动滚动更新。
- [ ] 提供安装、升级、卸载和回滚命令，不修改 KubeSphere 核心 Helm Chart 默认值。
- [ ] 在 131 测试环境先以独立 Namespace 安装，不修改 133。

### 任务 5：真实环境回归

- [ ] 构建并部署 Console 测试镜像，确认镜像包含完整 V3 制品且 `manifest.json` 未减少。
- [ ] 在 131 测试命名空间创建 Deployment、StatefulSet、DaemonSet，各自引用 ConfigMap 和 Secret。
- [ ] 关闭自动重启，修改配置后确认 Pod 不滚动更新。
- [ ] 开启自动重启，修改 ConfigMap/Secret 后确认仅引用该资源的工作负载滚动更新。
- [ ] 验证 `envFrom` 在详情面板重新打开后正确回显。
- [ ] 验证 Secret 值不出现在页面、请求日志和错误提示中。
- [ ] 回归集群、服务、工作负载列表和 V3 详情页面，确保没有新的空白、错位或英文 key。
- [ ] 保存测试证据、实际镜像 tag、Reloader 版本和回滚命令。

### 任务 6：发布前检查

- [ ] 运行所有新增单元测试、Console 构建和 `git diff --check`。
- [ ] 验证 131 中实际运行的 Console 镜像 tag 与构建提交一致。
- [ ] 请求代码审查，重点检查 PodTemplate 最小 PATCH 和 RBAC 范围。
- [ ] 未完成真实集群回归前，不标记功能完成，不合并正式分支。
