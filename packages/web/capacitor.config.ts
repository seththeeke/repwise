import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.repwisefit.app',
  appName: 'Repwise',
  webDir: 'dist',
  server: {
    // Match production domain so iOS/Android Password AutoFill can offer Keychain credentials
    // (Face ID / Touch ID unlock Keychain). Must match Associated Domains + site association file.
    hostname: 'repwisefit.com',
    androidScheme: 'https',
    // Optional: for live-reload during dev with `npx cap run ios --livereload --external`
    // url: 'http://<your-machine-ip>:5173',
    // cleartext: true
  },
};
export default config;
