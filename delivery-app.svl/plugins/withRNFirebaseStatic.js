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
      
      if (!contents.includes('pre_install do |installer|')) {
        contents = contents.replace(
          'prepare_react_native_project!',
          `pre_install do |installer|
  installer.pod_targets.each do |pod|
    is_firebase_pod = pod.name.start_with?('Firebase') || 
                      pod.name.start_with?('Google') || 
                      pod.name.start_with?('GTM') || 
                      pod.name.start_with?('nano') || 
                      pod.name.start_with?('Promises') || 
                      pod.name.start_with?('RNFB') || 
                      pod.name == 'RecaptchaInterop'
    if !is_firebase_pod
      def pod.build_type
        Pod::BuildType.static_library
      end
    end
  end
end

prepare_react_native_project!`
        );
      }

      if (!contents.includes('CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES')) {
        contents = contents.replace(
          'post_install do |installer|',
          `post_install do |installer|
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
      end
    end`
        );
      }

      await fs.promises.writeFile(file, contents, 'utf8');
      
      return config;
    },
  ]);
};

module.exports = withRNFirebaseStatic;
