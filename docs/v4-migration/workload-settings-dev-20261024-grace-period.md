# Workload 编辑设置分区修复 DEV 记录（2026-10-24）

## 发现

用户提供的 131 页面截图显示当前原生编辑设置只有“更新策略、容器组设置、存储设置、容器组调度规则、添加元数据”五个导航项。对固定 V3 制品 `packages/bootstrap/assets/v3dist/3.bb6cbee4309e765b70c1.js` 定向取证后确认，Deployment、StatefulSet、DaemonSet 的旧编辑设置映射均有独立的 `podMode` / `POD_GRACE_PERIOD` 分区；Deployment 和 StatefulSet 还分别包含适用的调度分区。

当前 V4 虽然已经支持 `terminationGracePeriodSeconds` 的解析、校验和写回，但把该字段放在“添加元数据”分区，导致导航和 V3 分区语义不等价。Deployment 页面显示副本数量和更新策略本身符合资源类型，这不是本轮缺陷。

## 修复

提交 `5c2525681` 将 `terminationGracePeriodSeconds` 移到独立的“容器组优雅终止”分区，并为 Deployment、StatefulSet、DaemonSet 都加入对应导航项。原有值解析、`0` 值保留、校验和资源写回逻辑未改变；元数据继续保留在独立的“添加元数据”分区。

## 测试先行与本地结果

- 修改前先在 `WorkloadSettingsModal.test.ts` 增加三类资源必须存在独立优雅终止导航和分区的断言，旧实现按预期失败：Deployment 缺少独立导航。
- 修复后定向测试通过：2 个测试、2 项断言场景通过。
- `./scripts/test.sh` 通过：91 个测试文件、402 项测试，0 失败。
- `corepack yarn build:packages` 通过；构建期间只有仓库既有 circular dependency warning，没有新增构建失败。
- `git diff --check` 通过。

## 尚未完成

本记录只关闭编辑设置分区结构的 DEV 缺口，不代表三类 Workload 已完成 VERIFY。仍需使用新的 CI 制品完成 131 部署、rollout/Ready、digest/imageID 核对及 Playwright 页面渲染和保存回读；完整字段、RBAC、namespace、缓存、错误路径和逐项 V3 等价仍未验收。测试账号当前登录失败的问题也仍需单独处理。
