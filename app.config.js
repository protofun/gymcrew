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
      // TODO: confirm before the first real App Store submission — this becomes permanent once
      // published (Apple won't let it change later).
      bundleIdentifier: "com.gymcrew.app",
      icon: "./assets/expo.icon",
    },
    android: {
      // TODO: confirm before the first real Play Store submission — same permanence as above.
      package: "com.gymcrew.app",
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
      favicon: "./assets/images/favicon/app_favicon.png",
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
      [
        "expo-image-picker",
        {
          photosPermission: "GymCrew needs access to your photos so you can set a profile picture.",
          cameraPermission: "GymCrew needs access to your camera so you can take a profile picture.",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#E3FF00",
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
