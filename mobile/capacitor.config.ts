import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tilkilab.emberwild',
  appName: 'Emberwild',
  webDir: '../out',
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
  server: {
    iosScheme: 'https',
  },
};

export default config;
