const { copyFile, cp, mkdir, rm } = require("node:fs/promises");
const path = require("node:path");
const {
  IOSConfig,
  withDangerousMod,
  withXcodeProject,
} = require("expo/config-plugins");

const WATCH_TARGET = "PawPairWatch";
const WATCH_BUNDLE_ID = "app.pawpair.medtracker.watchkitapp";

function unquote(value) {
  return String(value ?? "").replace(/^"|"$/g, "");
}

function findTarget(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const [key, value] of Object.entries(section)) {
    if (key.endsWith("_comment") || !value) continue;
    if (unquote(value.name) === name) return { uuid: key, pbxNativeTarget: value };
  }
  return null;
}

function setTargetBuildSettings(project, target, settings) {
  const listId = target.pbxNativeTarget.buildConfigurationList;
  const list = project.pbxXCConfigurationList()[listId];
  if (!list) throw new Error(`Missing build configuration list for ${WATCH_TARGET}`);
  const configurations = project.pbxXCBuildConfigurationSection();
  for (const item of list.buildConfigurations) {
    const configuration = configurations[item.value];
    if (!configuration) continue;
    Object.assign(configuration.buildSettings, settings);
  }
}

function addWatchTarget(project) {
  const existing = findTarget(project, WATCH_TARGET);
  if (existing) return existing;

  const target = project.addTarget(
    WATCH_TARGET,
    "watch2_app",
    WATCH_TARGET,
    WATCH_BUNDLE_ID,
  );
  const swiftFiles = [
    `${WATCH_TARGET}/PawPairWatchApp.swift`,
    `${WATCH_TARGET}/WatchCareStore.swift`,
    `${WATCH_TARGET}/CareHomeView.swift`,
  ];
  const resourceFiles = [`${WATCH_TARGET}/Assets.xcassets`];
  const group = project.addPbxGroup(
    [...swiftFiles, `${WATCH_TARGET}/Info.plist`, ...resourceFiles],
    WATCH_TARGET,
    WATCH_TARGET,
  );
  const mainGroup = project.getFirstProject().firstProject.mainGroup;
  project.addToPbxGroup(group.uuid, mainGroup);
  project.addBuildPhase(
    swiftFiles,
    "PBXSourcesBuildPhase",
    "Sources",
    target.uuid,
  );
  project.addBuildPhase(
    resourceFiles,
    "PBXResourcesBuildPhase",
    "Resources",
    target.uuid,
  );
  project.addBuildPhase(
    [],
    "PBXFrameworksBuildPhase",
    "Frameworks",
    target.uuid,
  );

  setTargetBuildSettings(project, target, {
    APPLICATION_EXTENSION_API_ONLY: "YES",
    ASSETCATALOG_COMPILER_APPICON_NAME: "AppIcon",
    CLANG_ENABLE_MODULES: "YES",
    CODE_SIGN_STYLE: "Automatic",
    CURRENT_PROJECT_VERSION: '"$(CURRENT_PROJECT_VERSION)"',
    ENABLE_PREVIEWS: "YES",
    GENERATE_INFOPLIST_FILE: "NO",
    INFOPLIST_FILE: `"${WATCH_TARGET}/Info.plist"`,
    MARKETING_VERSION: '"$(MARKETING_VERSION)"',
    PRODUCT_BUNDLE_IDENTIFIER: `"${WATCH_BUNDLE_ID}"`,
    PRODUCT_NAME: `"${WATCH_TARGET}"`,
    SDKROOT: "watchos",
    SKIP_INSTALL: "YES",
    SUPPORTED_PLATFORMS: '"watchos watchsimulator"',
    SWIFT_EMIT_LOC_STRINGS: "YES",
    SWIFT_VERSION: "5.0",
    TARGETED_DEVICE_FAMILY: '"4"',
    WATCHOS_DEPLOYMENT_TARGET: "10.0",
  });

  return target;
}

function addIOSBridge(project, projectName) {
  const mainTarget = project.getFirstTarget();
  const files = [
    `${projectName}/PawPairWatchBridge.swift`,
    `${projectName}/PawPairWatchBridge.m`,
  ];
  for (const file of files) {
    if (!project.hasFile(file)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: file,
        groupName: projectName,
        project,
        targetUuid: mainTarget.uuid,
      });
    }
  }
}

function withPawPairWatchProject(config) {
  return withXcodeProject(config, (projectConfig) => {
    const project = projectConfig.modResults;
    addIOSBridge(project, projectConfig.modRequest.projectName);
    addWatchTarget(project);
    return projectConfig;
  });
}

function withPawPairWatchFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (projectConfig) => {
      const iosRoot = projectConfig.modRequest.platformProjectRoot;
      const projectName = projectConfig.modRequest.projectName;
      const templateRoot = path.join(
        projectConfig.modRequest.projectRoot,
        "apple-watch",
      );
      const watchDestination = path.join(iosRoot, WATCH_TARGET);
      const bridgeDestination = path.join(iosRoot, projectName);

      await rm(watchDestination, { force: true, recursive: true });
      await cp(path.join(templateRoot, WATCH_TARGET), watchDestination, {
        recursive: true,
      });
      await mkdir(
        path.join(watchDestination, "Assets.xcassets", "AppIcon.appiconset"),
        { recursive: true },
      );
      await copyFile(
        path.join(projectConfig.modRequest.projectRoot, "assets", "pawpair-icon.png"),
        path.join(
          watchDestination,
          "Assets.xcassets",
          "AppIcon.appiconset",
          "AppIcon.png",
        ),
      );
      await copyFile(
        path.join(templateRoot, "ios", "PawPairWatchBridge.swift"),
        path.join(bridgeDestination, "PawPairWatchBridge.swift"),
      );
      await copyFile(
        path.join(templateRoot, "ios", "PawPairWatchBridge.m"),
        path.join(bridgeDestination, "PawPairWatchBridge.m"),
      );

      return projectConfig;
    },
  ]);
}

function withPawPairWatch(config) {
  config = withPawPairWatchProject(config);
  config = withPawPairWatchFiles(config);
  return config;
}

module.exports = withPawPairWatch;
module.exports.WATCH_BUNDLE_ID = WATCH_BUNDLE_ID;
module.exports.WATCH_TARGET = WATCH_TARGET;
