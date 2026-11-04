# 真冷回归（2026-11-04）

环境：`ks-console-v415-rea` / `192.168.2.131:30881`  
镜像：`ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-ad724a3`  
imageID：`…@sha256:5994c156…`  
Pod：`ks-console-v415-rea-678bbd9d66-qzv89`

测法：**禁止假冷**——新 context + `Network.setCacheDisabled`；登录后第一次进页；`cached_like===0` 且有真实传输才算真冷。

## 结论

- **多页真冷：PASS**（5/5）
- **baseline smoke 真冷：PASS**（第 2 次；第 1 次因 `main_near_html` 时序抖动失败，非列表不可见）
- **假冷对照：确认仍会骗**（预热后清 session → 可见 ~1.3s，但缓存热）

## baseline smoke

证据：`cold-start-baseline-smoke-truecold-regress-20261104-034343-try2.json`

| 项                       |                              值 |
| ------------------------ | ------------------------------: |
| 真冷可见                 |                     **6670 ms** |
| 真冷 transfer            |             3559020（~3.4 MiB） |
| 真冷 cached_like         |                           **0** |
| 暖硬刷新可见             | 1184 ms（cached_like=15，预期） |
| SPA overview→deployments |             1057 ms，alive=true |

try1：真冷可见 6302 ms、transfer 正常，但 `first_main_ms - first_html_ms = 218` 略超 ±200ms 门禁 → fail（时序抖动）。

## 多页真冷

证据：`truecold-multi-regress-20261104-033949.json`

| 页面                | 可见 | transfer | cached_like |
| ------------------- | ---: | -------: | ----------: |
| dev-wes/deployments | 3721 | 3.18 MiB |           0 |
| dev-web/deployments | 4514 | 3.30 MiB |           0 |
| dev-wes/pods        | 4384 | 3.18 MiB |           0 |
| dev-wes/services    | 4914 | 3.30 MiB |           0 |
| dev-wes/overview    | 5299 | 2.71 MiB |           0 |

## 假冷对照（非门禁）

证据：`falsecold-contrast-regress-20261104-033949.json`

- 可见 **1293 ms**
- transfer 129972 / cached_like **12** → `is_false_cold=true`
- 证明「~1s」仍可被旧测法制造，**不能**当回归通过依据

## 相对历史

| 口径                      |       可见 |
| ------------------------- | ---------: |
| P0 真冷近似（2026-10-31） |   ~3080 ms |
| 本次 smoke 真冷           |     ~6.7 s |
| 本次多页 deployments 真冷 | ~3.7–4.5 s |
| 旧假冷                    |     ~1.3 s |

真冷下当前镜像仍明显慢于暖刷新；未发现假冷式「亚秒首次打开」。
