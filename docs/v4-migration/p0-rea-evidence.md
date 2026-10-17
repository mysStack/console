# P0-REA 制品分析证据

> 取证日期：2026-10-17（上海时间）
> 任务分支：`feature/v4-p0-rea`
> 取证基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`
> 分析对象：`packages/bootstrap/assets/v3dist`
> 本文记录 focused REA 结果和限制，不代表 P0 门禁通过。

## 1. REA 调用

本轮对已存在的 V3 编译制品执行一次 focused JavaScript application 分析，未修改制品：

```text
工具：analyze_javascript_application
format：directory
detail：summary
analysis_timeout：300000
max_heap：1024
max_semantic_nodes：50000
max_semantic_nodes_per_file：12000
```

指定重点文件：

```text
4.49e1bbd1d064c2cb5c0d.js
8.efefc7072f02199ebc47.js
12.2a69b0c5dbf5a00a4a8d.js
7.e17520c994653ce8d2f4.js
18.4e47b566cbbe39ac49d2.js
main.558f452048e49db23323.js
3.bb6cbee4309e765b70c1.js
1.9ca3a76d71946712055c.js
```

REA 证据标识：

| 项目 | 值 |
| --- | --- |
| 视图 Evidence ID | `ev_ffb7b2d8944f03db1f81697faa230110d1bcf3d4ebd203d3cc8695662f29fd0c` |
| 父 Evidence ID | `ev_9ec76fca5d3ded4e263413f967715411463f8c622250d84abcb1c724065fcd8b` |
| 制品 SHA-256 | `0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4` |

## 2. 观察结果

| 指标 | 结果 |
| --- | ---: |
| 相关文件 | 440 |
| 本轮检查文件 | 441 |
| 总候选文件 | 994 |
| 本轮指定源文件 | 8 |
| 文本字节数 | 9,210,917 |
| UTF-8 无效字节 | 0 |
| 解析 JavaScript 文件 | 8 |
| AST 节点 | 2,461,512 |
| 静态发现 | 151 |
| 解析失败 | 0 |
| 分析耗尽 | 是（在本次视图范围内） |
| 视图外文件 | 432 |

结果说明：本轮视图在其选择范围内完成了静态解析，未发生解析失败；但这不是整个 44M 制品的完整语义覆盖。

## 2.1 资源模块字符串库存

在同一制品目录上补做不执行 Bundle 的字符串定位：

```bash
rg -il 'configmap' packages/bootstrap/assets/v3dist --glob '*.js' | wc -l
rg -il 'serviceaccount' packages/bootstrap/assets/v3dist --glob '*.js' | wc -l
rg -il 'secret' packages/bootstrap/assets/v3dist --glob '*.js' | wc -l
```

结果：`configmap` 出现在 7 个 JavaScript 文件，`serviceaccount` 出现在 6 个文件，`secret` 出现在 15 个文件。8 个 focused REA 指定 Chunk 中均能定位到至少一个相关资源字符串；`18.4e47b566cbbe39ac49d2.js` 只定位到 `secrets`，没有定位到 ConfigMap 或 ServiceAccount 字符串。

这只能证明制品中存在资源名和相关静态文本，不能证明对应页面已启用、Action 已触发、API 已调用或权限行为正确。具体 Chunk 与当前 V4 路由的映射仍需 REA 结构结果和 131 Network 证据共同确认。

## 3. 覆盖限制

- application coverage 为 partial，application unknowns 为 437；
- semantic coverage 为 partial/truncated，semantic unknowns 为 57,457；
- semantic graph 达到 50,000 节点上限；每文件上限为 12,000；
- `main.558f452048e49db23323.js`、`1.9ca3a76d71946712055c.js`、`12.2a69b0c5dbf5a00a4a8d.js`、`3.bb6cbee4309e765b70c1.js`、`7.e17520c994653ce8d2f4.js` 等大型 Chunk 出现资源约束；
- 432 个文件不在本次视图内；
- REA 使用静态文本和结构分析，没有执行 Bundle 启动代码，也没有观察浏览器路由、菜单、Network、权限或错误态；
- Webpack factory、动态名称和运行时拼接关系可能未解析，不能用静态发现数量推导完整业务行为。

## 4. 对 P0 的意义

本轮 focused REA 可用于确认制品身份、定位重点 Chunk 和为后续模块分析提供静态线索。它不能关闭以下未知项：

| 未知项 | 当前状态 | 需要的补充证据 |
| --- | --- | --- |
| P0-U001 旧源码与制品对应关系 | 未关闭 | 固定旧源码来源、commit/tag、许可证，或确认仅有编译制品 |
| P0-U002 启用路由、扩展、动态 Action | 未关闭 | 将静态发现与源码清单、菜单/权限和 131 运行时入口逐项映射；代表性运行时补充见 [P0 131 运行时证据](./p0-runtime-evidence.md) |
| P0-U003 运行时行为 | 部分覆盖 | 已在同一指定制品上采集代表性路由、菜单、Network、刷新/返回和错误态；全量入口及低权限权限对照仍待补，详见 [P0 131 运行时证据](./p0-runtime-evidence.md) |

## 5. 门禁结论

P0-REA 仍为“分析中”。本轮结果已形成可复核的 focused REA 证据，但覆盖存在明确边界，不能写成“全量 REA 已完成”，也不能自动进入 P1/P2 正式开发。后续必须把 REA Evidence、P0-Audit 静态盘点、P0-Baseline 来源核验和 131 脱敏运行时证据统一回填到 `rea-analysis-summary.md` 与迁移矩阵，提交项目负责人或指定复核人进行门禁验收。

## 6. 2026-10-17 Action 重点顺序复核

为补齐 P0-Audit 中的动态 Action 与制品字符串对应关系，本轮在同一 `v3dist` 制品上重新执行了一个更窄的 focused REA。分析没有执行 Bundle，也没有修改源文件或部署环境。

调用参数：

```text
工具：analyze_javascript_application
format：directory
detail：summary
analysis_timeout：300000
max_heap：1024
max_semantic_nodes：30000
max_semantic_nodes_per_file：12000
指定文件：1.9ca3a76d71946712055c.js、3.bb6cbee4309e765b70c1.js、
6.8bcf3ff261066d30352e.js、7.e17520c994653ce8d2f4.js、
8.efefc7072f02199ebc47.js、14.87db00577a502c52dfc5.js、
16.c38048441fc60c1f26b2.js
```

证据：

| 项目 | 值 |
| --- | --- |
| 视图 Evidence ID | `ev_1499abcad9683e664b746ef8c97b96092158e1ab805d6c75f60f17b23c9da037` |
| 父 Evidence ID | `ev_aabde5d443c3576511b4d159d889edc1f14faeb1a6ec3f02569b0dd5a3c5f268` |
| 模块分页 Evidence ID | `ev_3083b25b2745fe59e2e60fc1a76588981bde4e612879f2423511488efa1d87e7` |
| 制品 SHA-256 | `0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4` |
| 检查范围 | 441 / 957 个制品文件；433 个清单文件未进入本次源文件分析 |
| 解析文件 | 7 个 JavaScript 文件；0 个解析失败 |
| 静态发现 | 109 |
| application unknowns | 439 |
| semantic unknowns | 114,852 |

结果表明，7 个指定 Chunk 均被纳入同一制品身份下的静态分析，REA 对大型 Chunk 的语义图仍受到结果预算限制；构建引导代码未执行，不能从该证据推出 Action 的实际触发入口、权限结果、Network 请求或错误态。该证据补强了静态制品与当前 Action 字符串的关联，但 P0-U002 和 P0-U003 仍未关闭。
