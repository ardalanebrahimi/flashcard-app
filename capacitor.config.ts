import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.germanflashcard',
  appName: 'German Flashcard',
  webDir: 'dist/german-flashcard-temp/browser',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  },
  plugins: {
    Preferences: {
      group: 'com.example.germanflashcard.preferences'
    },
    StatusBar: {
      style: 'default',
      backgroundColor: '#007bff',
      overlaysWebView: false
    }
  }
};

export default config;
