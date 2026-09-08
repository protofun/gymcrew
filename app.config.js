/** @type {import('@expo/config').ExpoConfig} */
export default {
  expo: {
    name: "gymcrew",
    slug: "gymcrew",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "gymcrew",
    userInterfaceStyle: "dark",
    backgroundColor: "#0D1117",
    ios: {
      icon: "./assets/expo.icon",
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0D1117",
          image: "./assets/images/splash-icon.png",
          imageWidth: 76,
        },
      ],
      "@clerk/expo",
      "expo-secure-store",
      [
        "expo-camera",
        {
          cameraPermission: "GymCrew needs camera access to scan a barcode and add food to your log.",
          // GymCrew only ever scans barcodes — no video/photo capture needs audio, so skip
          // requesting the Android microphone permission entirely.
          recordAudioAndroid: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
      posthogHost: process.env.POSTHOG_HOST || "https://us.i.posthog.com",
    },
  },
};
