const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// zustand's ESM build (the one Metro picks for web) has a top-level
// `import.meta.env` check baked into its middleware bundle. Expo Router's web
// output is a plain (non-module) <script>, so that token throws "Cannot use
// 'import.meta' outside a module" for the whole bundle — a blank screen.
// Force zustand to resolve to its CJS build (no import.meta) on every platform.
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "zustand" || moduleName.startsWith("zustand/")) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ["react-native", "require", "default"] },
      moduleName,
      platform,
    );
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config);
