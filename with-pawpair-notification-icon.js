const { mkdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
} = require('expo/config-plugins');

const RESOURCE_NAME = 'notification_icon';
const RESOURCE_REFERENCE = `@drawable/${RESOURCE_NAME}`;
const FCM_ICON_METADATA = 'com.google.firebase.messaging.default_notification_icon';
const LOCAL_ICON_METADATA = 'expo.modules.notifications.default_notification_icon';

const NOTIFICATION_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <path
        android:fillColor="#FFFFFFFF"
        android:fillType="evenOdd"
        android:pathData="M12,10.15C8.25,10.15 5.15,13.02 5.15,16.45C5.15,19.18 7.37,20.92 9.66,20.02C11.14,19.44 12.86,19.44 14.34,20.02C16.63,20.92 18.85,19.18 18.85,16.45C18.85,13.02 15.75,10.15 12,10.15ZM12,17.42C11.52,17.08 8.83,15.36 8.83,13.65C8.83,12.61 9.57,11.9 10.55,11.9C11.24,11.9 11.76,12.25 12,12.78C12.24,12.25 12.76,11.9 13.45,11.9C14.43,11.9 15.17,12.61 15.17,13.65C15.17,15.36 12.48,17.08 12,17.42ZM6.31,7.63C6.31,9.14 5.43,10.28 4.32,10.28C3.19,10.28 2.34,9.18 2.34,7.66C2.34,6.16 3.2,5.04 4.32,5.04C5.44,5.04 6.31,6.14 6.31,7.63ZM10.41,4.66C10.41,6.29 9.43,7.55 8.19,7.55C6.95,7.55 5.98,6.31 5.98,4.68C5.98,3.04 6.94,1.8 8.19,1.8C9.44,1.8 10.41,3.03 10.41,4.66ZM18.02,4.68C18.02,6.31 17.05,7.55 15.81,7.55C14.57,7.55 13.59,6.29 13.59,4.66C13.59,3.03 14.56,1.8 15.81,1.8C17.06,1.8 18.02,3.04 18.02,4.68ZM21.66,7.66C21.66,9.18 20.81,10.28 19.68,10.28C18.57,10.28 17.69,9.14 17.69,7.63C17.69,6.14 18.56,5.04 19.68,5.04C20.8,5.04 21.66,6.16 21.66,7.66Z" />
</vector>
`;

function withPawPairNotificationManifest(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults
    );

    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      FCM_ICON_METADATA,
      RESOURCE_REFERENCE,
      'resource'
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      LOCAL_ICON_METADATA,
      RESOURCE_REFERENCE,
      'resource'
    );

    return manifestConfig;
  });
}

function withPawPairNotificationResource(config) {
  return withDangerousMod(config, [
    'android',
    async (androidConfig) => {
      const resourceRoot = path.join(
        androidConfig.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'res'
      );
      const drawableDirectory = path.join(resourceRoot, 'drawable');

      await Promise.all(
        ['drawable-mdpi', 'drawable-hdpi', 'drawable-xhdpi', 'drawable-xxhdpi', 'drawable-xxxhdpi'].map(
          (densityDirectory) =>
            rm(path.join(resourceRoot, densityDirectory, `${RESOURCE_NAME}.png`), {
              force: true,
            })
        )
      );
      await mkdir(drawableDirectory, { recursive: true });
      await writeFile(
        path.join(drawableDirectory, `${RESOURCE_NAME}.xml`),
        NOTIFICATION_ICON_XML,
        'utf8'
      );

      return androidConfig;
    },
  ]);
}

function withPawPairNotificationIcon(config) {
  config = withPawPairNotificationManifest(config);
  config = withPawPairNotificationResource(config);
  return config;
}

module.exports = withPawPairNotificationIcon;
module.exports.NOTIFICATION_ICON_XML = NOTIFICATION_ICON_XML;
