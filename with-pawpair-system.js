const { copyFile, mkdir } = require("node:fs/promises");
const path = require("node:path");
const {
  IOSConfig,
  withDangerousMod,
  withXcodeProject,
} = require("expo/config-plugins");

const SYSTEM_FILES = [
  "PawPairAppIntents.swift",
  "PawPairSystemBridge.swift",
  "PawPairSystemBridge.m",
];

function withPawPairSystemProject(config) {
  return withXcodeProject(config, (projectConfig) => {
    const project = projectConfig.modResults;
    const projectName = projectConfig.modRequest.projectName;
    const mainTarget = project.getFirstTarget();

    for (const fileName of SYSTEM_FILES) {
      const file = `${projectName}/${fileName}`;
      if (project.hasFile(file)) continue;
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: file,
        groupName: projectName,
        project,
        targetUuid: mainTarget.uuid,
      });
    }
    return projectConfig;
  });
}

function withPawPairSystemFiles(config) {
  return withDangerousMod(config, [
    "ios",
    async (projectConfig) => {
      const projectName = projectConfig.modRequest.projectName;
      const destination = path.join(
        projectConfig.modRequest.platformProjectRoot,
        projectName,
      );
      const source = path.join(
        projectConfig.modRequest.projectRoot,
        "apple-native",
        "ios",
      );
      await mkdir(destination, { recursive: true });
      for (const fileName of SYSTEM_FILES) {
        await copyFile(
          path.join(source, fileName),
          path.join(destination, fileName),
        );
      }
      return projectConfig;
    },
  ]);
}

function withPawPairSystem(config) {
  config = withPawPairSystemProject(config);
  config = withPawPairSystemFiles(config);
  return config;
}

module.exports = withPawPairSystem;
