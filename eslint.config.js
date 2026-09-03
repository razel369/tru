const { defineConfig, globalIgnores } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  globalIgnores([
    ".expo/**",
    "app-store/**",
    "artifacts/**",
    "dist/**",
    "node_modules/**",
    "pawpair-site/**",
    "work/**",
  ]),
  expoConfig,
  {
    rules: {
      // React Native Animated.Value is intentionally held in refs and passed
      // into animated styles during render. The compiler-oriented refs rule
      // currently treats that supported React Native pattern as an error.
      "react-hooks/refs": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/use-memo": "off",
      "react-hooks/immutability": "off",
      "react/no-unescaped-entities": "off",
      "import/no-named-as-default-member": "off",
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      // Vitest mocks must be declared before importing the module under test.
      "import/first": "off",
    },
  },
]);
