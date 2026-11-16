const ts = require('typescript');
const createLoadingTransformers = require('./loading-imports-transformer');

module.exports = function loadingJSLoader(source) {
  if (this.mode !== 'production') return source;
  return ts.transpileModule(source, {
    fileName: this.resourcePath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2019,
      jsx: ts.JsxEmit.React,
    },
    transformers: { before: createLoadingTransformers(this.rootContext) },
  }).outputText;
};
