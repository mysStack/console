# 配置引用 UI 尺寸记录

测量时间：2026-10-06 10:24（Asia/Shanghai）  
测量环境：131 测试环境，KubeSphere Console `wes-v2-server` 的「编辑设置 → 容器」页面。  
测量方式：Playwright `snapshot --boxes`，CSS 像素。

## V3 环境变量行

以当前容器环境变量编辑器的实际 DOM 为基准：

| 元素                 | 实测尺寸/位置                                                                        |
| -------------------- | ------------------------------------------------------------------------------------ |
| 环境变量列表容器     | `x=250, width=831px`                                                                 |
| 单行（普通单行变量） | `height=46px`                                                                        |
| 行内控件             | `height=32px`                                                                        |
| 普通变量的两列内容   | 左列约 `234px`，右列约 `350px`（随容器宽度伸缩）                                     |
| 删除按钮             | `width=58px, height=32px`，class 为 `button button-flat button-size-normal has-icon` |
| 行内垂直间距         | 行内控件上下各约 `7px`                                                               |

## 配置引用实现约束

- 配置引用行使用相同的 `46px` 最小行高和 `32px` 控件高度。
- 删除按钮复用 V3 的 `button-flat button-size-normal has-icon` 样式，不自定义另一套图标按钮。
- 配置引用的资源类型、资源名称和可选前缀仍保留为独立控件；现有环境变量行不改动。
- 测量数据用于 `ConfigReferenceInline.tsx` 的布局回归，截图等生成物不纳入提交。
