/**
 * Native ApplicationWorkloads detail has no Wujie click interceptor.
 * 编辑设置 must go through the config-reference bridge so「配置引用」
 * is injected beside「批量引用」in the environment-variable section.
 */
export function openNativeEditSettings(openEditor: () => void): void {
  openEditor();
}
