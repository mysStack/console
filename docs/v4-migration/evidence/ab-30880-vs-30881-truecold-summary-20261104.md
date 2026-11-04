# 30880 vs 30881 真冷对比（2026-11-04）

## 端口澄清

| 端口      | 服务                                       | 是否 Console |
| --------- | ------------------------------------------ | ------------ |
| **30080** | `watchalert-web`（页面 title=`React App`） | **否**       |
| **30880** | `ks-console`（旧/主 NodePort）             | 是           |
| **30881** | `ks-console-v415-rea`（冷启动优化线）      | 是           |

按「旧 Console」对比时，应对 **30880 vs 30881**，不是 30080。

## 镜像（不是同一产品形态）

| 端口  | 镜像                                                                            |
| ----- | ------------------------------------------------------------------------------- |
| 30880 | `ghcr.io/mysstack/ks-console:feature-v4-workloads-20261027-163225-e40408154dc9` |
| 30881 | `ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-ad724a3`             |

30880 跑的是 **V4 Workloads 功能镜像**；deployments list 为 **host 原生**（无 iframe / 无 v3dist）。  
30881 是 **release-4.1.5**，deployments list 仍走 **V3 iframe + v3dist**。

因此：**不能把 30881 比 30880 慢，解释成「冷启动优化把同一套页面弄慢了」。** 两边渲染栈不同。

## 真冷测法

新 context + `Network.setCacheDisabled`；登录后第一次进入目标页；禁止预热。

## deployments 可见时间（2 次）

| 页面                |                 30880（V4 host） |                    30881（V3 iframe） |
| ------------------- | -------------------------------: | ------------------------------------: |
| dev-wes/deployments | 1624 / 2108 ms（via=host, v3=0） | 3136 / 4566 ms（via=iframe, ~3.3MiB） |
| dev-web/deployments | 1711 / 1680 ms（via=host, v3=0） | 3816 / 3612 ms（via=iframe, ~3.3MiB） |

证据：`ab-30880-vs-30881-verify-20261104.json`  
初轮抽样：`ab-30880-vs-30881-truecold-20261104.json`（其中 web@30881 一次 19s 为抖动，复测未再现）

## 结论

1. 你说的「旧的 30080」实际不是 Console；旧 Console 端口是 **30880**。
2. 30880 更快，是因为 **Deployment 已 V4 原生**，不下载 sealed v3dist。
3. 30881 真冷 ~3–5s，成本在 V3 嵌入包；这与「相对 30880 的 V4 列表更慢」同时成立，但不等于冷启动补丁把同构页面优化坏了。
4. 若要评价 `#13/#15` 是否变慢，应对比 **同一 release-4.1.5 V3 嵌入镜像** 的补丁前/后真冷，而不是对比 30880 V4 Workloads。
