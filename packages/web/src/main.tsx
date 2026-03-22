import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import './lib/amplify';
import App from './App';
import './index.css';

// Hide iOS keyboard accessory bar (prev/next/Done) in native app for cleaner forms
if (Capacitor.getPlatform() !== 'web') {
  Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
