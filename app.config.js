export default {
  expo: {
    name: "Harvest",
    slug: "SnB-Harvest",
    version: "1.0.8",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    updates: {
      url: "https://u.expo.dev/f4ac27b7-e9ff-4f7f-9bd9-b0e79883c802"
    },
    runtimeVersion: {
      policy: "appVersion"
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
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#000000"
      },
      edgeToEdgeEnabled: true,
      package: "com.seedandbeyond.Harvest"
    },
    extra: {
      eas: {
        projectId: "f4ac27b7-e9ff-4f7f-9bd9-b0e79883c802"
      },
      // API Configuration
      apiConfig: {
        // Base URL
        baseUrl: 'https://ghdev.seedandbeyond.com:50000',
        apiVersion: '/b1s/v1',
        
        // Company Configuration
        companyDb: '__QAS',
        
        // Authentication Endpoints
        login: '/Login',
        usersServiceGetCurrentUser: '/UsersService_GetCurrentUser',
        
        // Data Endpoints
        cartMaster: '/U_CART_MASTER',
        hanger: '/U_HANGER',
        binLocations: '/BinLocations',
        items: '/Items',
        immaturePlanner: '/sml.svc/CV_IMMATURE_PLANNER_VW',
        batchNumberDetails: '/BatchNumberDetails',
        npfet: '/NPFET',
        npfetlines: '/NPFETLINES',
        batchService: '/$batch',
        nbnlg: '/NBNLG',
        
        // App Configuration
        appName: 'SH',
        appVersion: '1.0.8',
        
        // Timeout Configuration (in milliseconds)
        apiTimeout: 30000,
        batchTimeout: 60000,
        
        // Batch Processing
        batchSize: 200,
      }
    },
  },
};
