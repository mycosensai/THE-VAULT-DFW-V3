import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
<<<<<<< Updated upstream
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import { TRPCProvider } from '@/providers/trpc'
import App from './App.tsx'

const clerkPubKey =
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function createSessionId() {
  if (globalThis.crypto?.randomUUID) {
    return `sess_${globalThis.crypto.randomUUID()}`
  }

  const bytes = new Uint8Array(16)
  globalThis.crypto?.getRandomValues?.(bytes)

  const entropy = Array.from(
    bytes,
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('')

  return `sess_${entropy}`
}

if (!localStorage.getItem('vault_session_id')) {
  localStorage.setItem('vault_session_id', createSessionId())
}

createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={clerkPubKey}>
    <BrowserRouter>
      <TRPCProvider>
        <App />
      </TRPCProvider>
    </BrowserRouter>
  </ClerkProvider>,
=======
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
>>>>>>> Stashed changes
)
