import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchOnReconnect: true,
      staleTime: 30000,
      cacheTime: 5 * 60 * 1000,
      retry: 3,
    },
  },
});
const renderApp = () => {
  const container = document.getElementById('root');
  const root = createRoot(container);

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
};
const useMockApi = import.meta.env.VITE_USE_MOCK_API === 'true';

if (useMockApi) {
  import('./mocks/browser').then(({ worker }) => {
    worker.start({
      onUnhandledRequest: 'bypass', 
      serviceWorker: {
        url: '/mockServiceWorker.js',
      },
    }).then(() => {
      console.log('[MSW] Mock API aktif - Development mode tanpa backend');
      renderApp();
    });
  });
} else {
  renderApp();
}