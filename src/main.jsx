import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 60 * 2, retry: 1 },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              fontFamily: 'Heebo, sans-serif',
              direction: 'rtl',
              fontSize: '15px',
            },
            success: { iconTheme: { primary: '#2e7d32', secondary: '#fff' } },
            error: { iconTheme: { primary: '#c62828', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
