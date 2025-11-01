import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.elevatedsystems.contractorai',
  appName: 'ContractorAI',
  webDir: 'dist',
  ios: {
    contentInset: 'never'
  },
  server: {
    iosScheme: 'capacitor'
  }
};

export default config;
