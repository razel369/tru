const storeConfig = require("./store.config.json");
const metadata = require("./app-store/metadata.en-US.json");

storeConfig.apple.version = metadata.version;
storeConfig.apple.copyright = metadata.copyright;
storeConfig.apple.categories = [
  metadata.primaryCategory,
  metadata.secondaryCategory,
];
storeConfig.apple.info["en-US"] = {
  title: metadata.name,
  subtitle: metadata.subtitle,
  promoText: metadata.promotionalText,
  description: metadata.description,
  releaseNotes: metadata.releaseNotes,
  keywords: metadata.keywords.split(","),
  marketingUrl: metadata.marketingUrl,
  supportUrl: metadata.supportUrl,
  privacyPolicyUrl: metadata.privacyPolicyUrl,
  screenshots: {
    APP_IPHONE_67: [
      "./store/apple/screenshot/en-US/APP_IPHONE_67/01-golden-milo-daily-care.png",
      "./store/apple/screenshot/en-US/APP_IPHONE_67/02-frenchie-smart-routine.png",
      "./store/apple/screenshot/en-US/APP_IPHONE_67/03-siamese-health-passport.png",
      "./store/apple/screenshot/en-US/APP_IPHONE_67/04-dachshund-186-breeds.png",
      "./store/apple/screenshot/en-US/APP_IPHONE_67/05-pomeranian-privacy-watch.png",
    ],
    APP_WATCH_ULTRA: [
      "./store/apple/screenshot/en-US/APP_WATCH_ULTRA/01-today.png",
    ],
  },
};

module.exports = storeConfig;
