const {
  createRunOncePlugin,
  withAppBuildGradle,
  withDangerousMod,
  withInfoPlist
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PARTICLE_PLIST_NAME = 'ParticleNetwork-Info.plist';

function buildParticlePlist(props) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PROJECT_UUID</key>
  <string>${props.projectId || ''}</string>
  <key>PROJECT_CLIENT_KEY</key>
  <string>${props.clientKey || ''}</string>
  <key>PROJECT_APP_UUID</key>
  <string>${props.appId || ''}</string>
</dict>
</plist>
`;
}

function withParticleAndroid(config, props) {
  return withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language !== 'groovy') return modConfig;

    let contents = modConfig.modResults.contents;
    const placeholders = [
      `manifestPlaceholders["PN_PROJECT_ID"] = "${props.projectId || ''}"`,
      `manifestPlaceholders["PN_PROJECT_CLIENT_KEY"] = "${props.clientKey || ''}"`,
      `manifestPlaceholders["PN_APP_ID"] = "${props.appId || ''}"`
    ].join('\n        ');

    if (contents.includes('PN_PROJECT_ID')) {
      contents = contents.replace(
        /manifestPlaceholders\["PN_PROJECT_ID"\]\s*=\s*"[^"]*"/,
        `manifestPlaceholders["PN_PROJECT_ID"] = "${props.projectId || ''}"`
      );
      contents = contents.replace(
        /manifestPlaceholders\["PN_PROJECT_CLIENT_KEY"\]\s*=\s*"[^"]*"/,
        `manifestPlaceholders["PN_PROJECT_CLIENT_KEY"] = "${props.clientKey || ''}"`
      );
      contents = contents.replace(
        /manifestPlaceholders\["PN_APP_ID"\]\s*=\s*"[^"]*"/,
        `manifestPlaceholders["PN_APP_ID"] = "${props.appId || ''}"`
      );
    } else {
      contents = contents.replace(/defaultConfig\s*\{/, (match) => `${match}\n        ${placeholders}`);
    }

    if (!contents.includes('dataBinding {')) {
      contents = contents.replace(
        /android\s*\{/,
        (match) => `${match}\n    dataBinding {\n        enabled = true\n    }\n`
      );
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
}

function withParticleIos(config, props) {
  config = withInfoPlist(config, (modConfig) => {
    modConfig.modResults.NSFaceIDUsageDescription =
      modConfig.modResults.NSFaceIDUsageDescription ||
      'Mogate uses Face ID to protect wallet signing sessions.';
    return modConfig;
  });

  return withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const iosRoot = modConfig.modRequest.platformProjectRoot;
      const projectName = modConfig.modRequest.projectName || modConfig.name;
      const candidates = [
        path.join(iosRoot, modConfig.name || ''),
        path.join(iosRoot, projectName || ''),
        iosRoot
      ];
      const targetDir = candidates.find((candidate) => fs.existsSync(candidate)) || iosRoot;
      fs.writeFileSync(path.join(targetDir, PARTICLE_PLIST_NAME), buildParticlePlist(props));
      return modConfig;
    }
  ]);
}

function withParticleNetwork(config, props = {}) {
  const pluginProps = {
    projectId: props.projectId || '',
    clientKey: props.clientKey || '',
    appId: props.appId || ''
  };

  config = withParticleAndroid(config, pluginProps);
  config = withParticleIos(config, pluginProps);
  return config;
}

module.exports = createRunOncePlugin(withParticleNetwork, 'with-particle-network', '0.0.1');
