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
  keywords: metadata.keywords.split(","),
  marketingUrl: metadata.marketingUrl,
  supportUrl: metadata.supportUrl,
  privacyPolicyUrl: metadata.privacyPolicyUrl,
};

module.exports = storeConfig;
