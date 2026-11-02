# V3 产物减包下一轨道开项简报（2026-11-02）

## 评估结论

`release-4.1.5` host 侧冷启动补丁与观测固化已关闭。继续抠 BFF/Wujie 收益低。  
**下一轨道转到 `mysStack/kse-console-v3` 的 v3dist 构建产物**，目标是降低 deployments list 冷路径在可见前必须下载/解析的 JS 体积。

本简报只开项取证，**不授权本轮重编上线**，也不改 host console 业务代码。

## 实测基线（30881）

| 项      | 值                                                                  |
| ------- | ------------------------------------------------------------------- |
| 镜像    | `ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-ad724a3` |
| imageID | `…@sha256:5994c156…`                                                |
| Pod     | `ks-console-v415-rea-678bbd9d66-qzv89`                              |
| 场景    | deployments list 冷硬刷新（清 session）                             |
| 可见    | **1117ms**                                                          |
| 证据    | `v3dist-deployments-chunk-inventory-20261102.json`                  |

冷路径拉取：

- **可见前** 14 个资源 / **≈11.04 MiB**（按本地 v3dist 字节）
- 可见后仅再拉 ≈0.08 MiB
- 全量 v3dist JS 约 **26 MiB / 457 文件**；list 冷路径大约吃掉其中 **~40% 体积**

可见前最大 JS（按本地大小）：

| 文件                                           |       约 |                  首次请求 |
| ---------------------------------------------- | -------: | ------------------------: |
| `1.9ca3a76d71946712055c.js`（webpack chunk 1） | 3.05 MiB |                   ~1001ms |
| `0.79b1d388db9009cab691.js`（chunk 0）         | 1.96 MiB |                   ~1000ms |
| `main.558f452048e49db23323.js`                 | 1.93 MiB | ~434ms（host 已 preload） |
| `3.bb6cbee4309e765b70c1.js`（chunk 3）         | 1.86 MiB |                   ~1001ms |
| `12.2a69b0c5dbf5a00a4a8d.js`（chunk 12）       | 0.94 MiB |                   ~1001ms |

观察：main 已由 host 预加载；**可见前瓶颈转为 chunk 0/1/3/12 在 ~1s 附近并发到达**。产物侧若不拆分/推迟这些异步包，host 再预加载会与 list seed 抢带宽（阶段总结已明确不做全量 chunk preload）。

## V3 仓库现状（只读核验）

- 路径：`/home/bruce/code/ks-develop/kse-console-v3`
- 远程：`mysStack/kse-console-v3`
- 维护说明：构建产物进主 Console `v3dist`；禁止手改压缩产物
- 技术基线：React 16.6 / Webpack 4 / **Node 14 构建**
- 当前检出：`feature/v3-parity` @ `8843ead`，工作区有未提交 locales/docs，**不可借用该脏分支做减包**
- 集成线应按维护说明从 **`release-4.1.5`** 拉独立 `feature/*` 分支

## 建议开项顺序（V3 仓）

1. **干净分支**：`git fetch` 后从 `origin/release-4.1.5` 建 `feature/v3-cold-chunk-split`（名称可调整），不碰 `feature/v3-parity` 脏树。
2. **映射 chunk → 源码入口**：用源码 webpack splitChunks / 路由 `import()` 对照 chunk 0/1/3/12；必要时开 `stats.json` 构建，不依赖无 map 的 sealed 字符串猜测。
3. **优先手段（按 ROI）**：
   - 推迟非 list 关键路由/组件的异步边界（尤其 dashboard/actions/编辑器类）
   - 检查 chunk 1/0 是否过度合并 vendor（antd/lodash/图表等）
   - 保持 list 关键路径可缓存、可 br；不追求一次砍掉 main
4. **验收门禁**：新 v3dist 嵌入 `release-4.1.5` 测试镜像 → 30881 rollout → 跑  
   `scripts/cold-start-baseline-smoke.mjs` + 本 inventory 脚本；对比可见前 MiB 与冷可见 ms。  
   仅本地 `yarn build` 不算通过。
5. **明确不做**：在 host console 手改 sealed `v3dist`；在未映射前盲目改 webpack 全局配置；与 parity 文案改动混提交。

## 成功判据（建议）

- 可见前 v3dist 下载体积相对本简报基线下降 **≥25%**（约 ≤8.3 MiB），或冷可见稳定 **<900ms**（同环境同镜像对比方法）。
- baseline smoke 全绿；correctness / seed 形状不回退。

## 与已关闭阶段的关系

- host 基线镜像仍推荐：`release-4.1.5-merged-20261102-ad724a3`
- 固定回归：`scripts/cold-start-baseline-smoke.mjs`
- 本轨道失败或延期时，保持上述 host 基线，不回退到再开 host 微补丁循环
