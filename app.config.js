export default {
  expo: {
    name: "SnB-Harvest",
    slug: "SnB-Harvest",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.seedandbeyond.Harvest",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.seedandbeyond.Harvest"
    },
    extra: {
      eas: {
        projectId: "f4ac27b7-e9ff-4f7f-9bd9-b0e79883c802"
      }
    },
  },
};
