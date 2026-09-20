import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.jsx';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,        // data considered fresh for 5 min
      gcTime: 1000 * 60 * 30,          // cache kept for 30 min after unmount
      refetchOnWindowFocus: false,     // don't refetch on tab switch
      refetchOnMount: false,           // don't refetch on navigation back
      refetchOnReconnect: false,       // don't refetch on network reconnect
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);