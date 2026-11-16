/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

const { getOptions } = require('loader-utils');
const { validate } = require('schema-utils');

const schema = {
  type: 'object',
  properties: {
    importsMap: {
      type: 'object',
    },
  },
};

module.exports = function (source) {
  const options = getOptions(this);
  validate(schema, options, 'SystemImport Loader');

  const requests = Object.entries(options.importsMap);
  const imports = requests.map(([request]) => `import(${JSON.stringify(request)})`);
  const registrations = requests.map(([request, name], index) => {
    const value = `modules[${index}]`;
    if (request === 'react') {
      return `System.set(${JSON.stringify(name)}, {default:${value}.default, ...${value}.default});`;
    }
    if (request === 'wujie-react')
      return `System.set(${JSON.stringify(name)}, {default:ConsoleV3Embed});`;
    if (request === 'react-dom') return `System.set(${JSON.stringify(name)}, ${value}.default);`;
    return `System.set(${JSON.stringify(name)}, ${value}.default?.[Symbol.toStringTag] === 'Module' ? ${value}.default : ${value});`;
  });
  const initialization = `
    configureExtensionSDK(async () => {
      const modules = await Promise.all([${imports.join(',')}]);
      ${registrations.join('\n')}
      registerIconNamespace(System.get(${JSON.stringify(options.importsMap['@kubed/icons'])}));
    });
    installExtensionSDK().catch(error => console.error('Extension SDK initialization failed', error));
  `;
  const dependency = JSON.stringify(
    require('path').resolve(__dirname, '../../core/src/utils/extensionSDK'),
  );
  const iconRegistry = JSON.stringify(
    require('path').resolve(__dirname, '../../shared/src/components/Icon/registry'),
  );
  const adapter = JSON.stringify(
    require('path').resolve(__dirname, '../../shared/src/components/ConsoleV3Embed'),
  );
  return (
    `import ConsoleV3Embed from ${adapter};\n` +
    `import {registerIconNamespace} from ${iconRegistry};\n` +
    `import {configureExtensionSDK, installExtensionSDK} from ${dependency};\n` +
    source +
    initialization
  );
};
