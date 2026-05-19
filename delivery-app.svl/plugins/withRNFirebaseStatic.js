const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withRNFirebaseStatic = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const file = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = await fs.promises.readFile(file, 'utf8');

      // Removed $RNFirebaseAsStaticFramework since we are using expo-build-properties useFrameworks: "static"
      
      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |config|\n        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'\n      end\n    end`
        );
      }

      await fs.promises.writeFile(file, contents, 'utf8');
      
      return config;
    },
  ]);
};

module.exports = withRNFirebaseStatic;
