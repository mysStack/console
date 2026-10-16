# P0-Baseline 基线与制品边界证据

> 取证日期：2026-10-17（上海时间）
> 任务分支：`feature/v4-p0-baseline`
> 取证基线：`origin/feature/v4-migration` / `3e09afd6a051d4091b3c887462c880eff2ba6754`
> 本文只记录版本和来源边界，不代表 P0 门禁通过。

## 1. Git 基线

```text
Worktree: /home/bruce/code/ks-develop/console-p0-baseline
Branch:   feature/v4-p0-baseline
HEAD:     3e09afd6a051d4091b3c887462c880eff2ba6754
Tracking: origin/feature/v4-migration
Status:   clean（取证前）
```

核验命令：

```bash
git show-ref
git ls-remote origin \
  'refs/heads/feature/v4-migration' \
  'refs/heads/release-4.1.5' \
  'refs/tags/v4.1.5*'
```

结果：

| 引用 | 本地/远程解析结果 |
| --- | --- |
| `feature/v4-migration` | `3e09afd6a051d4091b3c887462c880eff2ba6754` |
| `release-4.1.5` | `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84` |
| `v4.1.5` tag object | `5d661a568bb3e4c58877b5129e8bdf45261dee6e` |
| `v4.1.5^{}` peeled commit | `fc1253cbedd5ade51a6c87bfff4e1f3b38536a84` |

本地和远程均未返回 `feature/config-history` 引用。该事实只表示当前 Git 引用中没有该分支，不能替代对历史 PR、提交或远程已删除分支的审计。

## 2. 旧源码和制品边界

在 `/home/bruce/code/ks-develop` 和 `/home/bruce/code` 进行有限目录扫描：

```bash
find /home/bruce/code/ks-develop /home/bruce/code -maxdepth 3 \
  -type d \( -name 'kse-console-v3' -o -iname '*console*v3*' \) -print
```

当前扫描没有找到可直接核验的 `kse-console-v3` 旧源码目录。这不是“旧源码不存在”的证明，只能确认本轮环境内尚未定位到固定路径、版本和许可证。

进一步检查当前仓库的远程发布引用后，确认同一仓库保留了 V3 源码发布分支：

| 远程引用 | 提交 | 日期 | 源码事实 |
| --- | --- | --- | --- |
| `origin/release-3.2` | `5e6b2d05361fc8bd70b04e900a914b399deae7a8` | 2022-10-09 | 根目录 `src/`，含 `src/actions/configmap.js`、`src/actions/serviceaccount.js` |
| `origin/release-3.3` | `cd90e5b64326df76432a9cafb05c2a08aa40ecdf` | 2023-02-01 | 根目录 `src/`，含 ConfigMap、ServiceAccount 页面和 Action |
| `origin/release-3.4` | `175710fefeeba6ff295c2c0967b4d45b83563d26` | 2024-01-18 | 根目录 `src/`，含 ConfigMap、ServiceAccount 页面和 Action |

三个分支的 `package.json` 均声明版本 `3.0.0`、许可证 `AGPL-3.0`。这些引用提供了可核验的旧 V3 源码候选基线；本轮优先以 `origin/release-3.4` 作为最新 V3 源码参考，但不能把分支名直接等同于 `v3dist` 的构建来源。

当前可核验的 V3 分析对象是构建制品：

```text
路径：/home/bruce/code/ks-develop/console-p0-baseline/packages/bootstrap/assets/v3dist
大小：约 44M
REA 制品 SHA-256：0cfc6e64a2555f12b1ebca6d87ae8713bdae5dbad04c2ec2093d1d4de50b0bf4
```

另计算了目录内文件逐项 SHA-256 排序后的文件列表摘要：

```text
9bc69b9b4b509846ca079a61b9b072e1a204fb79c3afe2e8090f56166fc0d59c
```

该摘要只是本轮文件列表摘要，不能替代 REA 返回的制品 SHA-256，也不能推导制品对应的源码提交。

## 2.1 制品到服务入口的静态对应关系

源码中可以确认以下关系：

- `server/views/consolev3.html` 将 `bundlePrefix` 固定为 `/dist/v3dist`，并从 manifest 加载 V3 CSS/JS；
- `packages/bootstrap/webpack/webpack.base.conf.js` 使用 CopyWebpackPlugin 将 `assetsPath/v3dist` 复制到 `dist/v3dist`；
- 因此当前 `packages/bootstrap/assets/v3dist` 是构建时输入，部署后对应的静态服务前缀是 `/dist/v3dist`。

这是构建和模板层面的静态对应关系，不等于已在 131 环境观察到该制品被实际加载。仍需在指定部署制品上核验 HTML、静态资源响应、浏览器 console 和 Network。

## 2.2 当前制品的 Git 历史来源线索

在当前 P0 取证基线执行：

```bash
git log -1 --format='%H%n%P%n%ad%n%s' --date=iso-strict -- packages/bootstrap/assets/v3dist
```

得到：

```text
commit:  3f3064787042a95792b591f4aea4231ea7988bb0
parent:  ff2e7919ed36f388274f7718390289961e025d3c
date:    2025-06-13T13:51:48+08:00
message: [master] chore(bot): update v3dist from kse-console-embed:kse-release-4.1 to kubesphere/console:release-4.1 at 2025-06-13 10:50:13+0800 (#4616)
```

这为当前目录中的 `v3dist` 提供了 Git 历史更新提交和外部镜像标签线索，但没有给出 `kse-console-embed:kse-release-4.1` 内部对应的 V3 源码 commit。制品与 `origin/release-3.4` 的源码对应关系仍需通过镜像构建元数据、制品清单或项目负责人确认。

另外，历史分支 `feature/workload-envfrom-console` 的提交 `8fdfde044b4c7e9518bbe0edce794a2a75d87d65` 曾携带 `packages/bootstrap/assets/v3dist/.v3dist-source.json`：

```json
{
  "schemaVersion": 1,
  "repository": "mysStack/kse-console-v3",
  "ref": "feature/v3-artifact-decouple",
  "commit": "8843eadf1",
  "builtAt": "2026-10-03T13:18:23+08:00",
  "publicPath": "/dist/v3dist/"
}
```

当前 `origin/feature/v4-migration` 的 `v3dist` 不包含这个元数据文件，且其最近目录更新提交是 2025 年的 `3f3064787`。因此不能把历史元数据直接套到当前 P0 制品；需要先确认本轮指定测试制品到底是 2025 年外部镜像输入，还是 2026 年带有该元数据的另一套制品。

## 3. 当前边界和风险

- `release-4.1.5` 是稳定发布基线；P0 取证分支从 `feature/v4-migration` 当前远程提交创建，两者用途不同，不能混写成同一基线。
- 当前可以确认 Git 引用和 `v3dist` 制品身份，但尚未建立“旧 V3 源码 commit/tag ↔ v3dist 制品”的可核验对应关系。
- 没有执行生产部署、没有修改稳定分支、没有删除制品或历史引用。
- 没有找到 `feature/config-history` 引用不等于可以直接删除所有相关代码；删除动作必须由独立分支、历史和引用审计支持。

## 4. 关闭条件与门禁结论

P0-U001 已从“未定位源码”推进到“已定位候选源码引用”，但仍未完全关闭。还需要证明 `v3dist` 制品与哪个 V3 源码提交、构建配置和依赖锁定文件对应；在对应关系未建立前，不能把 `origin/release-3.4` 直接当作制品的确定源码来源。P0-Baseline 当前为“进行中/待统一复核”，不授权 P1/P2 正式开发。
