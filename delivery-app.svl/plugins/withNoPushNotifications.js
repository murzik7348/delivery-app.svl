const { withEntitlementsPlist, withXcodeProject } = require('@expo/config-plugins');

const withNoPushNotifications = (config) => {
  // 1. Remove aps-environment from entitlements
  config = withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });

  // 2. Remove Push Notifications capability from project.pbxproj
  config = withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const project = xcodeProject.hash.project.objects.PBXProject;

    for (const key in project) {
      if (!key.endsWith('_comment')) {
        const pbxProject = project[key];
        if (pbxProject.attributes && pbxProject.attributes.TargetAttributes) {
          const targetAttributes = pbxProject.attributes.TargetAttributes;
          for (const targetKey in targetAttributes) {
            const target = targetAttributes[targetKey];
            if (target.SystemCapabilities && target.SystemCapabilities['com.apple.Push']) {
              delete target.SystemCapabilities['com.apple.Push'];
            }
          }
        }
      }
    }

    return config;
  });

  return config;
};

module.exports = withNoPushNotifications;
