# Workload YAML 校验缺陷 DEV 记录（2026-10-25）

## 1. 缺陷确认

在当前 `feature/v4-workloads` 制品 `4b363c688f1e784acb68fe32117756f03bb55bd2` 上，通过 131 浏览器的 Deployment 原生 YAML 编辑器提交非法 YAML。页面弹窗保持打开，Kubernetes API 返回 `400 Bad Request`，资源仍为 `1/1`；页面没有显示可见错误提示或 `role=alert`。

证据见 [`workload-yaml-validation-defect-20261025.json`](./evidence/workload-yaml-validation-defect-20261025.json)。

## 2. 根因

- `packages/shared/src/utils/yaml.ts` 的 `load` 捕获并吞掉 `js-yaml` 解析异常，然后返回原始字符串。
- Deployment、StatefulSet、DaemonSet 项目列表的 YAML handler 直接把该返回值交给更新 mutation。
- `useUpdateDeploymentMutation` 没有透传 `onError`，API 错误无法由三类页面统一反馈。

## 3. DEV 修复范围

1. 增加严格 YAML 解析入口，合法 YAML 返回对象，非法 YAML 抛出解析异常。
2. 三类资源的 YAML handler 在解析失败时停止 mutation，保留编辑弹窗并显示保存失败提示。
3. Workload 更新 mutation 透传 API 错误回调，覆盖 400、403、409 和网络失败的统一反馈入口。
4. 复用当前 V4 原生页面、Store 和错误提示，不引入 V3/Wujie。

## 4. 修复与本地验证

先新增严格解析回归用例，旧实现的 RED 结果为 2 项失败（`loadStrict` 不存在）。完成修复后执行以下检查：

```text
./node_modules/.bin/esno packages/shared/src/utils/yaml.test.ts                         2/2 通过
Deployment / StatefulSet / DaemonSet index.test.ts                                      各 4/4 通过
./scripts/test.sh                                                                       92 个测试文件、409 项测试通过
corepack yarn build:packages                                                            成功
相关 ESLint 文件检查                                                                  0 个错误、3 个警告
git diff --check                                                                        通过
```

修复提交为 `e066ddac4`，提交标题为 `修复(Workload)：阻止非法 YAML 提交并反馈错误`。

## 5. 首次修复的部署后复验

提交 `e066ddac4` 随记录提交 `2676f00d0` 构建并部署到 131 后，使用新的浏览器会话再次提交同一非法 YAML。当前制品仍向 Deployment API 发起 `PUT`，请求体类型为字符串，返回 `400`；弹窗保持打开并显示 `BadRequest`，但客户端没有在 API 请求前阻止非法内容。Pod 镜像身份和资源 `1/1` 正常。

证据见 [`workload-yaml-validation-regression-20261025.json`](./evidence/workload-yaml-validation-regression-20261025.json)。该结果证明首次修复没有闭环，不能标记 VERIFY 通过。

## 6. 第二次修复

首次部署回归显示，编辑器可能传入 `String` 对象；旧实现使用 `isObject` 判断时会直接返回该对象，导致它绕过 YAML 解析。旧实现对标量 YAML 也没有确认解析结果是 Kubernetes 对象。

提交 `c8b0df35c` 完成以下最小修复：

1. 对原始字符串和 `String` 对象统一转为文本后调用 `js-yaml` 解析。
2. 对非字符串输入保留已有对象更新路径。
3. 要求解析结果为非数组对象；标量、空文档和数组文档直接抛出错误，不进入 mutation。
4. 新增 `String` 对象非法 YAML 和标量 YAML 回归测试。

## 7. 第二次 DEV 本地验证

```text
./node_modules/.bin/esno packages/shared/src/utils/yaml.test.ts                         4/4 通过
./scripts/test.sh                                                                       92 个测试文件、411 项测试通过
相关 ESLint 文件检查                                                                  0 个错误、3 个已有警告
corepack yarn build:packages                                                            成功
git diff --check                                                                        通过
```

## 8. 第二次修复的部署后回归

提交 `c8b0df35c` 的列表页已经使用 `loadStrict`，但浏览器实际进入的是三类资源详情页。详情页通过共享 `useCommonActions` 打开 YAML 编辑器，运行时追踪确认调用的是 `yaml.load(data)`，没有调用 `loadStrict`。非法 YAML 因此仍以字符串发起 Deployment PUT，API 返回 `400`，弹窗保持打开。

证据见 [`workload-yaml-validation-common-action-regression-20261025.json`](./evidence/workload-yaml-validation-common-action-regression-20261025.json)。该结果证明第二次修复仍未覆盖完整的 Workload YAML 编辑入口。

## 9. 阶段处理

第二次修复未闭环，已按模块门禁再次退回 `DEV / 进行中`。下一次修复必须将通用详情页改为严格解析，并在解析失败或 API 失败时显示保存失败提示、保持弹窗打开且不发起非法 PUT。完成后重新执行测试、构建、CI、131 rollout、Pod 镜像身份核对和部署后 Playwright 验收。
