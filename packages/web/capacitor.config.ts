import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.repwise.app',
  appName: 'Repwise',
  webDir: 'dist',
  server: {
    // Optional: for live-reload during dev with `npx cap run ios --livereload --external`
    // url: 'http://<your-machine-ip>:5173',
    // cleartext: true
  },
};
export default config;
