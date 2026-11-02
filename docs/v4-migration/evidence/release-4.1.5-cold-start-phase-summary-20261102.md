# release-4.1.5 冷启动阶段总结（2026-11-02）

## 评估结论

本阶段以 **list 深链硬刷新可见时间** 与 **带宽竞态消除** 为主目标。按实测，继续在 console BFF 上做小补丁的 ROI 已明显下降；**建议暂停新的冷启动代码改动**，将当前 merged 镜像视为本阶段交付基线。

未继续推进的理由：

1. list 可见已到约 **冷 1.0s / 暖 0.8s**（#15 合并镜像），相对 #11+#12 合并时「V3 首次引导约 3.5s 地板」已明显改善。
2. 已关掉主要人为竞态：静态 br q11、list seed 写通、actions dashboard 与 list chunk 抢跑。
3. 剩余成本集中在 sealed `v3dist` 异步 chunk 下载/解析与 V3 运行时本身，不适合再靠 host 侧小补丁硬抠。

## 交付镜像（当前 30881）

- tip: `ad724a38b`（功能）+ docs `fe28842d7`
- 镜像: `ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-ad724a3`
- imageID: `ghcr.io/mysstack/ks-console@sha256:5994c1562f8ab6d59bffac3cf39adb22ffe02801b3cc3da74c86c34485605f6e`
- 环境: `ks-console-v415-rea @ 192.168.2.131:30881`
- Pod（验收时）: `ks-console-v415-rea-678bbd9d66-qzv89`

## 关键链路（相关 PR）

| PR  | 主题                     | 作用                                |
| --- | ------------------------ | ----------------------------------- |
| #6  | wujie boot destroy       | 共享实例销毁竞态                    |
| #8  | kapis 代理压缩           | 代理响应重新可压缩                  |
| #10 | V3 boot phase            | 启动阶段整理                        |
| #11 | static br q4             | 静态资源 brotli 默认 q11 → q4       |
| #12 | list seed / husk / alive | 精确 seed、空 husk、AliveEmbed 清理 |
| #13 | defer actions            | list 落地后延迟 dashboard 预热 2s   |
| #14 | docs                     | #13 合并验收证据                    |
| #15 | host preload main        | list 路径预加载 v3dist main.css/js  |
| #16 | docs                     | #15 合并验收证据                    |

## 关键对比（deployments list）

| 阶段           | 证据                                           | 冷可见             | 暖可见    | 备注                                  |
| -------------- | ---------------------------------------------- | ------------------ | --------- | ------------------------------------- |
| #11+#12 合并后 | `release-4.1.5-merged-acceptance-20261101.md`  | ~3.5s 地板（结论） | —         | br 已降到约 1.5s；主成本仍是 V3 boot  |
| #13 后         | `merged-defer-actions-timing-20261102.json`    | 1271ms             | 1073ms    | dashboard 约在可见后 +2s              |
| #15 后（当前） | `merged-v3-asset-preload-timing-20261102.json` | **1054ms**         | **798ms** | main 早于/重叠 HTML；dashboard 仍延后 |

#15 冷路径关键时间线（ms，nav 起点）：

- manifest@362 → main@384 → html@547 → visible@1054 → dashboard@3257

## 正确性 / 回归

- correctness：pass（seed 形状、list 可见）
- P1：pass（冷/暖硬刷新阈值、SPA keep-alive 往返；偶发冷刷新略超 5s 时复测通过）

## 剩余地板（接受为现状）

1. **sealed `v3dist` 体积与异步 chunk**：main 之后仍要拉/解析大量分包；host 只预加载 entrypoint，不再扩到全量 chunk（会与 list seed 抢带宽）。
2. **SPA 场景 host seed 常赶不上子应用首次 GET**：one-shot 精确 seed 的设计取舍，不改写通。
3. **springcloud probe localStorage TTL ~5min**：可能短暂陈旧；暖刷新已跳过 host CRD。
4. **console 仍是 BFF**：OAuth/session/proxy/EJS，不改成纯 nginx 静态站。

## 明确不做（本阶段）

- `renderV3View` session-cache（BFF HTML 本身约 70–200ms，收益上限低，且有 user/ksConfig 过期风险）
- 预加载全部 v3dist 异步 chunk
- 在本仓库拆包/重编 sealed V3 业务 bundle
- 为再抠亚秒可见而扩大共享底座改动面

## 观测固化（已落地）

固定 smoke：`scripts/cold-start-baseline-smoke.mjs`

- 覆盖：list 硬刷新冷/暖可见、main 与 HTML 重叠、dashboard 不抢跑、SPA overview→deployments keep-alive
- 阈值：冷 <5s / 暖 <3.5s / SPA <3s（与 P1 同族）
- 首次固化证据：`cold-start-baseline-smoke-20261102.json`（pass；冷 1069ms / 暖 1115ms / SPA 1236ms；Pod `…qzv89` 同基线镜像）

运行（建议在 `/tmp/pw-p0`）：

```bash
cp scripts/cold-start-baseline-smoke.mjs /tmp/pw-p0/
KS_OUT=docs/v4-migration/evidence/cold-start-baseline-smoke-$(date -u +%Y%m%d).json \
KS_IMAGE=… KS_IMAGE_ID=… KS_POD=… \
node /tmp/pw-p0/cold-start-baseline-smoke.mjs
```

## 若后续再开项

优先顺序建议：

1. **V3 产物侧**：减小/拆分 sealed `v3dist`（需 V3 构建流水线，不在本 console 补丁循环内）
2. 仅当有新的实测竞态证据时，再开小补丁分支
3. 回归时先跑 `cold-start-baseline-smoke.mjs`，失败再对照本总结剩余地板

## 结论

**release-4.1.5 冷启动补丁阶段关闭。**  
生产/联调以 `ghcr.io/mysstack/ks-console:release-4.1.5-merged-20261102-ad724a3` 为当前推荐基线；后续性能工作转到 V3 产物或独立议题，而不是继续叠加 host 侧微优化。
