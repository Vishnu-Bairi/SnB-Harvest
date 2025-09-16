const getConfig = (env = 'test') => {
  const configs = {
    test: {
      baseUrl: 'https://ghdev.seedandbeyond.com:50000',
      companyDb: '__QAS',
    },
    production: {
      baseUrl: 'https://glasshouseweb.seedandbeyond.com:50000',
      companyDb: 'LIVE'
    }
  };

  const selectedConfig = configs[env] || configs.test;

  return {
    expo: {
      name: env === 'production' ? "Harvest" : "Harvest Test",
      slug: "SnB-Harvest",
      version: "1.0.10",
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
        "url": "https://u.expo.dev/6d393036-7040-4f15-9cd0-256feb7e0f83"
      },
      runtimeVersion: {
        policy: "appVersion"
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: env === 'production' ? "com.seedandbeyond.Harvest" : "com.seedandbeyond.HarvestTest",
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
        package: env === 'production' ? "com.seedandbeyond.Harvest" : "com.seedandbeyond.HarvestTest"
      },
      extra: {
        eas: {
          projectId: "6d393036-7040-4f15-9cd0-256feb7e0f83"
        },
        // API Configuration
        apiConfig: {
          // Base URL
          baseUrl: selectedConfig.baseUrl,
          apiVersion: '/b1s/v1',
          
          // Company Configuration
          companyDb: selectedConfig.companyDb,
          
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
          appVersion: '1.0.10',
          
          // Timeout Configuration (in milliseconds)
          apiTimeout: 30000,
          batchTimeout: 60000,
          
          // Batch Processing
          batchSize: 200,
        }
      },
    },
  };
};

// Get environment from multiple sources
const getEnvironment = () => {
  // Check for EXPO_PUBLIC_ENV first
  if (process.env.EXPO_PUBLIC_ENV) {
    return process.env.EXPO_PUBLIC_ENV;
  }
  
  // Check for NODE_ENV as fallback
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  // Default to test
  return 'test';
};

const environment = getEnvironment();

export default getConfig(environment);
