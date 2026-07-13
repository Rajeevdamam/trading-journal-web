import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Self-hosted fonts: no third-party requests, works offline in the PWA
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/space-grotesk/600.css'
import '@fontsource/space-grotesk/700.css'
// icon font is a 5 KB subset built by scripts/subset-icons.py (see styles.css @font-face)

import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
