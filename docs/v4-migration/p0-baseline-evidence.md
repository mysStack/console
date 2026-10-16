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

## 3. 当前边界和风险

- `release-4.1.5` 是稳定发布基线；P0 取证分支从 `feature/v4-migration` 当前远程提交创建，两者用途不同，不能混写成同一基线。
- 当前可以确认 Git 引用和 `v3dist` 制品身份，但尚未建立“旧 V3 源码 commit/tag ↔ v3dist 制品”的可核验对应关系。
- 没有执行生产部署、没有修改稳定分支、没有删除制品或历史引用。
- 没有找到 `feature/config-history` 引用不等于可以直接删除所有相关代码；删除动作必须由独立分支、历史和引用审计支持。

## 4. 关闭条件与门禁结论

P0-U001 仍未关闭。需要项目负责人提供或确认旧 V3 源码来源、版本和许可证；如果最终只有编译制品，必须明确“源码未知、仅做制品分析”的范围，并在总计划中保留这一限制。P0-Baseline 当前为“进行中/待统一复核”，不授权 P1/P2 正式开发。
