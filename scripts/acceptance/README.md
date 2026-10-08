# 配置引用 · 手工验收

`config-reference.mjs` 是一个**断言驱动**的验收脚本：它通过 Chrome DevTools Protocol
驱动一个已登录的控制台，把「配置引用」面板切到各种状态，然后断言面板上的文案与 chip
是否符合预期——不是靠肉眼看截图判断。

## 为什么不进 CI

**它不进 CI，也不是单元测试。**

- 单元测试在 `scripts/test.sh`（22 个文件 / 79 个用例，只依赖 `node:*`，不需要集群）。
- 这个脚本需要：一个真实集群、一个真实控制台、一个带调试端口的浏览器，以及一套特定的
  ConfigMap / Secret 作为素材。把它接进 CI 会让构建依赖一个活着的环境。

它存在的意义是覆盖**只有把扩展注入到真实控制台之后才存在的那些行为**。本次开发中发现的
真实缺陷——Secret 行未选资源仍显示预览、手动收起后不再自动展开、非法 prefix 被误报成
「键会被丢弃」、按容器归属错误——全部来自这一层，单元测试一个都抓不到。

## 前置条件

1. 浏览器带 `--remote-debugging-port=<port>` 启动，并且**已登录**目标控制台。
   （登录步骤不在本脚本内：它不持有任何凭据。）
2. 目标工作负载的**配置引用面板处于打开状态**
   （部署 → 更多操作 → 编辑设置 → 容器 → 配置引用），因为脚本驱动的是这个面板。
3. 下列素材存在（脚本按名字引用；缺失时对应用例会失败并明确指出）：

   | 素材                                          | 位置                   | 用途                                                                            |
   | --------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------- |
   | `dsh-test-keys`                               | `dev-wes`              | 边界键：`GOOD_KEY`、`bad.key`、`1STARTS_WITH_DIGIT`，以及 binaryData `blob.bin` |
   | `wes-job`                                     | `dev-wes`              | 单键，且与手动环境变量冲突                                                      |
   | `kube-root-ca.crt`                            | `dev-wes`              | 全部键非法（`ca.crt` 含点）                                                     |
   | `wes-app`                                     | `dev-wes`              | 空 ConfigMap                                                                    |
   | `ewms-postgres-wes-config`、`wes-application` | `dev-wes`              | 跨引用重名                                                                      |
   | `aliyun-registry-secret`                      | `dev-wes`              | Secret 键名可见 + 非法键 `.dockerconfigjson`                                    |
   | `wes-v2-server`、`ams-server`                 | `dev-wes` / `test-wes` | 被测工作负载                                                                    |

   `dsh-test-keys` 是测试专用的临时对象，用完请删：

   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: dsh-test-keys
     namespace: dev-wes
     labels:
       purpose: dsh-acceptance-test
       temporary: 'true'
   data:
     GOOD_KEY: 'valid-key'
     bad.key: 'contains-dot'
     1STARTS_WITH_DIGIT: 'starts-with-digit'
   binaryData:
     blob.bin: 'aGVsbG8gZGF0YQ=='
   ```

## 运行

```sh
node scripts/acceptance/config-reference.mjs --port 9333 --match 192.168.2.131
```

- `--port`：浏览器的远程调试端口（默认 `9333`）
- `--match`：用于挑选调试目标页面的 URL 子串（默认 `192.168.2.131`）

全部通过时退出码为 `0`；任一用例失败为 `1`，并逐条打印缺失或多余的文案。

## 覆盖的 12 个用例

| #   | 场景                           | 断言要点                                                           |
| --- | ------------------------------ | ------------------------------------------------------------------ |
| S1  | ConfigMap 未选资源             | 完全不渲染预览                                                     |
| S2  | Secret 未选资源                | 完全不渲染预览（曾回归过：Secret 分支绕过了 `resolved` 检查）      |
| S3  | 有键且与手动 env 冲突          | 报「1 个与环境变量重名」并自动展开                                 |
| S4  | 加前缀 `X_`                    | 冲突消失、收起、无告警                                             |
| S5  | 点「查看」                     | 展开出 chip `X_JOB_ADDRESS`                                        |
| S6  | 点「收起」                     | 折叠                                                               |
| S7  | 边界键                         | 「2 个键会被丢弃」+「1 个 binaryData 不读取」，chips 含 `blob.bin` |
| S8  | 全部键非法                     | 「没有可生效的键」+「1 个键会被丢弃」                              |
| S9  | 跨引用重名                     | 报「2 个与其它引用重名」而不是「与环境变量重名」                   |
| S10 | 空 ConfigMap                   | 「没有可生效的键」，且**不显示**无意义的展开按钮                   |
| S11 | 手动收起后换成同样有问题的资源 | 重新自动展开（曾回归过：override 永久生效）                        |
| S12 | Secret 键名可见                | `.dockerconfigjson` 被标出「会被丢弃」                             |

## 与只读页有关的验证不在本脚本内

只读「环境变量」页的注入（按容器分组、变量值、`******`、空值 `—`）需要导航到不同页面并
点击全局展开，步骤与面板用例差别较大，目前是用 CDP 计划文件单独跑的。如果要把它也做成
自动断言，可以照本脚本的结构再加一个 `read-only.mjs`。
