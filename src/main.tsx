import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, getSettings } from './lib/settings.ts'

// Applied before the first paint (not inside a React effect) so there's no flash of the wrong
// theme while React mounts.
applyTheme(getSettings().theme)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
