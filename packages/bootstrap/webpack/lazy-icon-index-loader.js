/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const { parseSync } = require('@babel/core');

// Keep the installed package's public exports and require paths. Only the
// barrel's eager requires move into getters; each icon remains the original
// React component, including its ref, variants and default props.
module.exports = function lazyIconIndexLoader(source) {
  const fail = reason => {
    throw new Error(`Unsupported icon index: ${reason}`);
  };
  const ast = parseSync(source, { babelrc: false, configFile: false, sourceType: 'script' });
  const bindings = new Map();
  const exports = new Map();
  const helpers = new Map();
  let esModule = false;

  for (const statement of ast.program.body) {
    if (statement.type === 'FunctionDeclaration') {
      helpers.set(statement.id.name, source.slice(statement.start, statement.end));
      continue;
    }
    if (statement.type === 'VariableDeclaration') {
      for (const declaration of statement.declarations) {
        const call = declaration.init;
        const request = call?.arguments?.[0];
        const target = request?.arguments?.[0];
        if (
          declaration.id.type !== 'Identifier' ||
          call?.type !== 'CallExpression' ||
          call.callee.type !== 'Identifier' ||
          call.arguments.length !== 1 ||
          request?.type !== 'CallExpression' ||
          request.callee.name !== 'require' ||
          request.arguments.length !== 1 ||
          target?.type !== 'StringLiteral' ||
          !target.value.startsWith('./')
        )
          fail('require declaration');
        if (bindings.has(declaration.id.name)) fail('duplicate binding');
        bindings.set(declaration.id.name, { helper: call.callee.name, path: target.value });
      }
      continue;
    }
    const call = statement.expression;
    if (
      statement.type !== 'ExpressionStatement' ||
      call?.type !== 'CallExpression' ||
      call.callee.type !== 'MemberExpression' ||
      call.callee.object.name !== 'Object' ||
      call.callee.property.name !== 'defineProperty' ||
      call.arguments.length !== 3 ||
      call.arguments[0].name !== 'exports' ||
      call.arguments[1].type !== 'StringLiteral' ||
      call.arguments[2].type !== 'ObjectExpression'
    )
      fail('statement');
    const name = call.arguments[1].value;
    const properties = call.arguments[2].properties;
    const fields = Object.fromEntries(
      properties.map(property => [property.key.name || property.key.value, property.value]),
    );
    if (name === '__esModule') {
      if (esModule || properties.length !== 1 || fields.value?.value !== true) fail('module flag');
      esModule = true;
      continue;
    }
    const getter = fields.get;
    const returned = getter?.body?.body?.[0];
    const member = returned?.argument;
    if (
      properties.length !== 2 ||
      fields.enumerable?.value !== true ||
      getter?.type !== 'FunctionExpression' ||
      getter.params.length !== 0 ||
      getter.body.body.length !== 1 ||
      returned?.type !== 'ReturnStatement' ||
      member?.type !== 'MemberExpression' ||
      member.object.type !== 'Identifier' ||
      (member.computed ? member.property.value : member.property.name) !== 'default' ||
      exports.has(name)
    )
      fail('export getter');
    exports.set(name, member.object.name);
  }

  if (!esModule || exports.size === 0 || new Set(exports.values()).size !== bindings.size)
    fail('export mapping');
  for (const binding of exports.values()) {
    if (!bindings.has(binding) || !helpers.has(bindings.get(binding).helper))
      fail('unresolved export');
  }
  const usedHelpers = new Set(Array.from(bindings.values(), binding => binding.helper));
  if (usedHelpers.size !== helpers.size) fail('unreferenced helper');

  // SystemJS.set otherwise Object.assigns the namespace and evaluates every
  // getter immediately. Its native Module branch preserves lazy property reads.
  const header =
    '"use strict";\nObject.defineProperty(exports,"__esModule",{value:true});\n' +
    'Object.defineProperty(exports,Symbol.toStringTag,{value:"Module"});\n';
  return (
    header +
    Array.from(helpers.values()).join('\n') +
    '\n' +
    Array.from(exports, ([name, variable]) => {
      const binding = bindings.get(variable);
      return `Object.defineProperty(exports,${JSON.stringify(name)},{enumerable:true,get:function(){return ${binding.helper}(require(${JSON.stringify(binding.path)})).default;}});`;
    }).join('\n')
  );
};
