# 冷启动测法勘误（2026-11-03）

## 问题

`scripts/cold-start-baseline-smoke.mjs` 以及 `#13/#15` 若干 timing 脚本采用：

1. 先 `goto` deployments 并等到可见（预热）
2. 再 `sessionStorage.clear()`（仅清会话）
3. 再计时一次硬刷新

这会让 **HTTP 磁盘/内存缓存保持热态**。复现时「假冷」可见约 **1.2s**，且 `performance` 里 v3dist `transferSize=0`、`cached_like≈15`。

因此下列数字 **不能** 当作用户首次打开：

| 证据                                               | 宣称冷可见 | 状态 |
| -------------------------------------------------- | ---------: | ---- |
| `merged-v3-asset-preload-timing-20261102.json`     |     1054ms | 假冷 |
| `cold-start-baseline-smoke-20261102.json`          |     1069ms | 假冷 |
| `v3dist-deployments-chunk-inventory-20261102.json` |     1117ms | 假冷 |

阶段总结里「冷 1.0s / 暖 0.8s」据此写的结论需降级为：**仅描述缓存已热的硬刷新**，不是真冷。

## 正确口径

| 场景     | 做法                                                                            | 校验                                         |
| -------- | ------------------------------------------------------------------------------- | -------------------------------------------- |
| 真冷     | 新 `BrowserContext` + CDP `Network.setCacheDisabled`；登录后 **第一次** 进 list | `transfer_sum ≥ 1MiB` 且 `cached_like === 0` |
| 暖硬刷新 | 同上下文预热后再 `goto`                                                         | 允许缓存                                     |
| SPA      | overview→deployments keep-alive                                                 | 与缓存无关，仍有效                           |

## 与历史对比（同环境 30881）

| 点                                     |      可见 | 备注                                 |
| -------------------------------------- | --------: | ------------------------------------ |
| P0 全量复测冷（2026-10-31，`5e87c37`） |   ~3080ms | 新 context、无 list 预热，较接近真冷 |
| 当前镜像真冷（2026-11-03，`ad724a3`）  | ~4.1–5.6s | 禁用缓存；多页同量级                 |
| 旧 smoke 假冷（同日对照）              |     ~1.3s | transfer=0                           |

在真冷口径下，**看不出 `#13/#15` 相对 P0 基线有亚秒级改善**；preload/defer 对「已缓存硬刷新」可能仍有帮助，但不能再写成首次打开收益。

## 脚本修复

`scripts/cold-start-baseline-smoke.mjs` 已改为真冷测法，并增加 `true_cold_uncached_transfer` 门禁。阈值默认冷 <8s / 暖 <5s（可用环境变量覆盖）。
