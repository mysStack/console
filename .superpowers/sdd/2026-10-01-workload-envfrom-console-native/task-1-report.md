# Task 1 报告：纯 `envFrom` 领域模型

## 改动文件

- `packages/console/src/pages/projects/components/WorkloadForm/types.ts`：新增 `EnvFromReference`、`EnvFromSource` 与重复项契约。
- `packages/console/src/pages/projects/components/WorkloadForm/envFrom.ts`：新增 `parseEnvFrom`、`serializeEnvFrom`、`findDuplicateEnvFrom`、`removeIncompleteEnvFrom` 纯函数。
- `packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts`：使用仓库已有 `node:test` 约定覆盖 ConfigMap、Secret、前缀、解析、重复和空行。

## TDD RED

先创建测试，再运行简报指定命令：

```text
$ corepack yarn jest packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts --runInBand
yarn run v1.22.22
error Command "jest" not found.
```

仓库安装了 `babel-jest` 但没有 Jest CLI；因此按现有 `node:test` 测试约定改用 TypeScript loader 运行测试。实现前运行：

```text
$ node node_modules/tsx/dist/cli.js packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find module './envFrom'
```

失败原因是被测转换模块尚不存在，符合 RED 阶段。

## TDD GREEN

实现最小纯函数后运行：

```text
$ node node_modules/tsx/dist/cli.js packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts
1..5
# tests 5
# pass 5
# fail 0
```

附加检查：

```text
$ corepack yarn prettier --check packages/console/src/pages/projects/components/WorkloadForm/types.ts packages/console/src/pages/projects/components/WorkloadForm/envFrom.ts packages/console/src/pages/projects/components/WorkloadForm/envFrom.test.ts
Checking formatting...
All matched files use Prettier code style!

$ git diff --check
# no output
```

## 自审与风险

- `serializeEnvFrom` 只输出 Kubernetes `EnvFromSource` 引用；空前缀不写入，空名称行会被过滤。
- `parseEnvFrom` 只接受带 ConfigMap/Secret 引用且名称非空的项；无效项会被忽略。
- 重复判定按 `type + name`，不同类型同名不算重复；返回后续重复项的原始索引。
- 未修改 V3、后端或路由；未触碰既有未跟踪文件，也未提交 `.playwright-cli/` 或 `docs/superpowers/` 历史文件。
- 风险：Jest CLI 在当前安装环境不可用，GREEN 使用仓库已有 `node:test` 风格并通过 `tsx` loader 执行；后续 CI 若启用 Jest，应直接复用同一测试文件。
