import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elevated.contractorai',
  appName: 'ContractorAI',
  webDir: 'dist',
  ios: {
    contentInset: 'never'
  },
  server: {
    iosScheme: 'capacitor'
  },
  plugins: {
    Purchases: {
      apiKey: 'appl_eqImMiOTWqoGHkqkjePGfJrLhMA' // PUBLIC iOS API key
    }
  }
};

export default config;
