// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // src/components/ui + src/shared are Reacticx components copied in by its CLI (see component.config.json)
    // — third-party source we only patch, not code written to this project's lint rules.
    ignores: ["dist/*", "src/components/ui/**", "src/shared/**"],
  }
]);
