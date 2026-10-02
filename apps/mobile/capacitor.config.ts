import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gridcommand.tactical',
  appName: 'GridCommand',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    // Hardware Volume button listener and haptics
  },
};

export default config;
