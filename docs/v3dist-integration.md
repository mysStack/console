# V3 静态制品集成

`kse-console-v3` 独立负责 V3 源码、测试和构建。带 `v*` 的 V3 Tag 会生成并发布
`console-v3dist-<tag>.tar.gz`，其中包含 `manifest.json`、`manifest.locale.json` 和静态资源。
制品还包含 `.v3dist-source.json`，记录来源仓库、Release Tag 和构建 Commit SHA。

Console 镜像构建默认继续使用仓库中已提交的 `packages/bootstrap/assets/v3dist` 作为回退资源。
需要引入指定 V3 版本时，在 `Build Personal Console Image` 的手动任务中填写 `v3_ref`，Action 会：

1. 从 `mysStack/kse-console-v3` 的 GitHub Release 下载对应制品；
2. 校验 manifest 和来源元数据存在，并校验仓库、版本和构建 Commit SHA；
3. 在 `make container-cross` 之前替换构建目录中的 V3 静态资源；
4. 将 V3 资源打进最终 `ks-console` 镜像，不在运行时访问 GitHub。

V3 构建使用 `/dist/v3dist/` public path，确保动态 chunk 从 KubeSphere Console 的嵌入路径加载。
没有明确的 V3 Release 版本时，不要覆盖当前回退资源。
