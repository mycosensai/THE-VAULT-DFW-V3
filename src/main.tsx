import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import { TRPCProvider } from "@/providers/trpc"
import App from './App.tsx'

// Initialize anonymous session ID for cart operations
if (!localStorage.getItem('vault_session_id')) {
  localStorage.setItem('vault_session_id', 'sess_' + Math.random().toString(36).slice(2) + Date.now().toString(36))
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <TRPCProvider>
      <App />
    </TRPCProvider>
  </BrowserRouter>
)
