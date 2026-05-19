const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRNFirebaseStatic = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(file, 'utf8');

      if (!contents.includes('$RNFirebaseAsStaticFramework = true')) {
        contents = `$RNFirebaseAsStaticFramework = true\n` + contents;
        await fs.promises.writeFile(file, contents, 'utf8');
      }
      return config;
    },
  ]);
};

module.exports = withRNFirebaseStatic;
