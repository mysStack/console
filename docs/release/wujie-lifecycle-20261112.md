# 修复首次列表进入时的 Wujie 生命周期冲突

基线：release-4.1.5 / e2602ee1c5880382835027b15aebfd2e9feeb139。本次维护既有发布线，不新增 V4 迁移模块或全站路由方案。

## 根因与证据

core 的 initWujie 同时 setup/preload consolev3。预加载的宿主在 iframe 内，首次列表没有拿到 afterMount 回调，父 document 中也找不到其宿主。因此 ResourceList 的 `!lastConsoleV3AppWindow && !isConsoleV3InstanceMounted()` 会把存在的预加载实例误认为失效实例并调用 destroyApp。

浏览器诊断记录：同一 consolev3 实例在2142ms触发 destroy/unmount，在2182ms继续 active，此时 provide/head/shadowRoot 已为空。预加载 continuation 继续访问 provide.props，产生空对象异常。已完成预加载的实例则会触发异步 unmount 的 head.\_cacheListeners 空对象访问。

实际 DLL 使用 wujie-react 1.0.25 所依赖的嵌套 wujie 1.0.25，该版本 destroy 同步清空字段、却不等待异步 unmount；仓库根目录 wujie 1.0.29 的源码在这里已有 await，但不能把该源码误当作实际运行的1.0.25。本次不升级依赖，避免扩大变更范围；保留原有显式失效重建行为，修复已经证实的首次进入误销毁。

诊断注入遍历 iframe 会额外触发 Wujie 主动中断代理访问的 Error，不能把该诊断下的错误总数当作基线数据。随后无沙箱 monkey-patch 的浏览器对照只改首次进入分支：原逻辑2轮各2个 \_cacheListeners 异常；取消销毁3轮均0个 pageerror，且列表/详情/原生日志/搜索/返回完成。对照均通过浏览器响应替换运行，未修改部署制品、未写集群数据；不作为正式性能数据。

## 最小修复

- 首次进入时把实例选择交给 Wujie startApp：已有实例时复用，并由 Wujie 等待 preload promise；不存在时正常创建。
- 没有收到任何实例生命周期回调前，不让3秒恢复定时器把慢启动误判为损坏。
- mutation revision 导致的重建、已挂载空实例的 revive/retry、路由同步、日志回调和权限逻辑不变。
- 移除要求初次进入必须销毁的过时源码匹配测试，增加执行真实组件 mount effect 的两项回归：pending/mounted 预加载实例均被保留；慢启动超过恢复定时点仍不销毁。

RED：原分支新测试0/2；取消初次销毁后扩展慢启动断言1/2；保护恢复定时器后2/2通过。完整回归、Actions镜像、部署后浏览器结果以本次候选SHA的发布记录为准，本文不提前声称制品验收已完成。

## 验收重点与边界

正式镜像上检查新建页面、直接详情、Deployment/Pod详情复用、列表返回刷新、菜单切换、命名空间隔离、日志搜索，并延迟V3主脚本超过3秒验证慢启动；性能测量单独运行且不拦截请求。

现有预加载期间还会输出 getStoreWithQueryHooks 控制台错误，原逻辑与对照均出现，未归因为本次生命周期问题。本修复不表示所有微前端问题或冷首屏成本已解决，也不覆盖所有资源编辑及长期运行。
