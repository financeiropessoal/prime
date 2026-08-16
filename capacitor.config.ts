import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.primeautomotive.app',
  appName: 'Prime Automotive',
  webDir: 'out',
  // Carrega o site ao vivo da Vercel no app (requer internet)
  // Troque pela URL do seu domínio próprio se tiver
  server: {
    url: 'https://www.primechavescodificadas.com.br',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    // Permissões necessárias para Bluetooth
    CapacitorBluetooth: {
      displayName: 'Prime Automotive',
    },
  },
};

export default config;
