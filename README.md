# SnB-Harvest App

A React Native application for managing harvest operations with SAP Business One integration.

## Environment Configuration

This app uses a centralized configuration system to manage all API endpoints and settings.

### Configuration Files

1. **`.env`** - Environment variables (create from `.env.example`)
2. **`config/api.js`** - Centralized API configuration that reads from `.env`
3. **`babel.config.js`** - Babel configuration for environment variable support
4. **`types/env.d.ts`** - TypeScript declarations for environment variables

### Setup Instructions

1. **Create your environment file:**
   ```bash
   cp env.example .env
   ```

2. **Update the `.env` file with your production values:**
   ```bash
   # API Base URLs
   API_BASE_URL=https://your-production-domain.com:port
   API_VERSION=/b1s/v1
   
   # Company Configuration
   COMPANY_DB=YOUR_COMPANY_DB
   
   # Other configurations...
   ```

3. **The environment package is already installed:**
   ```bash
   npm install react-native-dotenv  # Already done
   ```

### Configuration Structure

#### API Configuration (`config/api.js`)

The configuration file exports several objects:

- **`API_CONFIG`** - Raw configuration values
- **`API_URLS`** - Pre-built API URLs
- **`COMPANY_CONFIG`** - Company-specific settings
- **`APP_CONFIG`** - Application settings

#### Usage Examples

```javascript
import { API_URLS, COMPANY_CONFIG, APP_CONFIG } from '../config/api';

// Using pre-built URLs
const response = await fetch(API_URLS.LOGIN, {
  method: 'POST',
  body: JSON.stringify({
    CompanyDB: COMPANY_CONFIG.DB,
    UserName: username,
    Password: password
  })
});

// Using app configuration
const batchSize = APP_CONFIG.BATCH_SIZE;
```

#### How Environment Variables Work

The configuration system now **actually reads from your `.env` file**:

```javascript
// config/api.js
import { API_BASE_URL, COMPANY_DB } from '@env';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL || 'https://ghdev.seedandbeyond.com:50000',
  COMPANY_DB: COMPANY_DB || 'GHDPOS',
  // ... other variables
};
```

**Fallback Values:** If an environment variable is not set, the system uses the default hardcoded values as fallbacks.

### Available Configuration Options

#### API Endpoints
- `LOGIN` - Authentication endpoint
- `CART_MASTER` - Cart master data
- `HANGER` - Hanger information
- `BIN_LOCATIONS` - Location data
- `ITEMS` - Item information
- `IMMATURE_PLANNER` - Planning data
- `NPFET` - Harvest records
- `BATCH_SERVICE` - Batch operations

#### Company Settings
- `COMPANY_DB` - Database name
- `COMPANY_NAME` - Company display name

#### App Settings
- `APP_NAME` - Application identifier
- `APP_VERSION` - Version number
- `BATCH_SIZE` - Batch processing size
- `API_TIMEOUT` - API request timeout

### Benefits

1. **Centralized Management** - All URLs in one place
2. **Easy Updates** - Change endpoints without touching code
3. **Environment Switching** - Different configs for dev/staging/prod
4. **Security** - Sensitive data not hardcoded
5. **Maintainability** - Consistent configuration across the app

### Security Notes

- Never commit `.env` files to version control
- Use different configurations for different environments
- Regularly rotate API keys and credentials
- Monitor API access logs

### Troubleshooting

If you encounter issues:

1. **Check import paths** - Ensure correct relative paths
2. **Verify configuration** - Check all required values are set
3. **Restart development server** - After configuration changes
4. **Check console logs** - For configuration loading errors

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Production Deployment

1. Update `.env` with production values
2. Build the app bundle
3. Deploy to app stores
4. Monitor API performance and errors
