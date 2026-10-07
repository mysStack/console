/*
 * Please refer to the LICENSE file in the root directory of the project.
 * https://github.com/kubesphere/console/blob/master/LICENSE
 */

// Plain CommonJS on purpose. The script uses __dirname and require() below, so
// an `import` here made Node's module detection load it as ESM on Node >= 20,
// where neither exists — it only ever worked because esno rewrote it to CJS.
// esno still runs this file, and so does plain node.
const path = require('path');
const fs = require('fs-extra');

const EXCLUDE_NAMES = ['.DS_Store', 'package.json', 'CHANGELOG.md', 'dist'];

async function buildLocales() {
  const localesPath = path.join(__dirname, '../locales');
  const dirs = fs.readdirSync(localesPath);
  dirs.forEach(dir => {
    if (!EXCLUDE_NAMES.includes(dir)) {
      const localeFiles = fs.readdirSync(path.join(localesPath, dir));
      const distPath = path.join(__dirname, '../locales/dist/', dir);
      fs.ensureDirSync(distPath);
      localeFiles.forEach(file => {
        if (file.endsWith('.js')) {
          try {
            const localeContent = require(path.join(localesPath, dir, file));
            const filename = `${file.replace('.js', '')}.json`;
            fs.writeJsonSync(path.join(distPath, filename), localeContent);
          } catch (e) {}
        }
      });
    }
  });
}

buildLocales();
