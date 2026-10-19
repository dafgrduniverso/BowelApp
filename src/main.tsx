import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Ask the browser not to evict our IndexedDB under storage pressure.
navigator.storage?.persist?.().catch(() => {})

// Service worker: offline support. New versions apply on next launch, or immediately if the user agrees.
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm('A new version of Gut Tracker is available. Reload now?')) updateSW(true)
  },
})
