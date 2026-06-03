const { withPlugins, withXcodeProject, withEntitlementsPlist } = require('@expo/config-plugins');
const fs = require('fs-extra');
const path = require('path');

const OLD_APP_GROUP_ID = 'group.expoLiveActivity.sharedData';
const APP_GROUP_ID = 'group.com.murzik7348.K-and-M';

/**
 * Ensures the App Group entitlement is added to the provided entitlements object.
 */
function withAppGroupEntitlement(entitlements) {
  let groups = entitlements['com.apple.security.application-groups'] || [];
  
  // Remove old ID if present
  groups = groups.filter(g => g !== OLD_APP_GROUP_ID);
  
  if (!groups.includes(APP_GROUP_ID)) {
    groups.push(APP_GROUP_ID);
  }
  entitlements['com.apple.security.application-groups'] = groups;
  return entitlements;
}

/**
 * 1. Copies files from /widgets to /ios/LiveActivity
 * 2. Scans copied files for old App Group ID and replaces it
 */
const withLiveActivityFiles = (config) => {
  return withXcodeProject(config, async (config) => {
    const { projectRoot } = config.modRequest;
    const widgetsSource = path.join(projectRoot, 'widgets');
    const iosWidgetPath = path.join(projectRoot, 'ios', 'LiveActivity');

    // 1. Copy files
    if (fs.existsSync(widgetsSource)) {
      await fs.ensureDir(iosWidgetPath);
      await fs.copy(widgetsSource, iosWidgetPath, {
        overwrite: true,
      });

      // 2. Search and replace App Group ID in the copied files
      const files = fs.readdirSync(iosWidgetPath);
      for (const file of files) {
        const filePath = path.join(iosWidgetPath, file);
        if (fs.lstatSync(filePath).isFile()) {
          let content = fs.readFileSync(filePath, 'utf8');
          if (content.includes(OLD_APP_GROUP_ID)) {
            console.log(`[withLiveActivity] Replacing App Group ID in ${file}`);
            content = content.split(OLD_APP_GROUP_ID).join(APP_GROUP_ID);
            fs.writeFileSync(filePath, content);
          }
        }
      }
    }

    return config;
  });
};

/**
 * Main Plugin
 */
const withBurgerFulLiveActivity = (config) => {
  return withPlugins(config, [
    // 1. Add App Group to Main App
    [withEntitlementsPlist, (config) => {
      config.modResults = withAppGroupEntitlement(config.modResults);
      return config;
    }],
    // 2. Let expo-live-activity create the target
    "expo-live-activity",
    // 3. Our custom sync and cleanup
    withLiveActivityFiles,
    withCustomWidgetSync
  ]);
};

/**
 * Custom sync to ensure our specific files are in the target and entitlements are correct
 */
const withCustomWidgetSync = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const targetName = 'LiveActivity';
    const projectRoot = config.modRequest.projectRoot;
    
    // Find the target
    const target = xcodeProject.pbxNativeTargetSection();
    const targetUuid = Object.keys(target).find(key => target[key].name === targetName);

    if (!targetUuid) {
        console.warn(`[withLiveActivity] Target ${targetName} not found. Ensure expo-live-activity plugin is running.`);
        return config;
    }

    // Add App Group to the extension's entitlements file
    const entitlementsPath = path.join(projectRoot, 'ios', targetName, `${targetName}.entitlements`);
    
    if (fs.existsSync(entitlementsPath)) {
        let content = fs.readFileSync(entitlementsPath, 'utf8');
        // Simple XML replacement for entitlements
        if (content.includes(OLD_APP_GROUP_ID)) {
            content = content.split(OLD_APP_GROUP_ID).join(APP_GROUP_ID);
        } else if (!content.includes(APP_GROUP_ID)) {
            // If it's a fresh file from expo-live-activity, it might just have <dict/>
            if (content.includes('<dict/>')) {
                content = content.replace('<dict/>', `<dict>\n\t<key>com.apple.security.application-groups</key>\n\t<array>\n\t\t<string>${APP_GROUP_ID}</string>\n\t</array>\n</dict>`);
            } else {
                content = content.replace('</dict>', `\t<key>com.apple.security.application-groups</key>\n\t<array>\n\t\t<string>${APP_GROUP_ID}</string>\n\t</array>\n</dict>`);
            }
        }
        fs.writeFileSync(entitlementsPath, content);
    }

    return config;
  });
};

module.exports = withBurgerFulLiveActivity;

