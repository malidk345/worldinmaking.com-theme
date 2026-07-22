import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Lemon UI component SCSS (pure CSS rules, no JS imports)
import '../../src/lib/lemon-ui/LemonButton/LemonButton.scss'
import '../../src/lib/lemon-ui/LemonBadge/LemonBadge.scss'
import '../../src/lib/lemon-ui/LemonTag/LemonTag.scss'
import '../../src/lib/lemon-ui/LemonBanner/LemonBanner.scss'
import '../../src/lib/lemon-ui/LemonInput/LemonInput.scss'
import '../../src/lib/lemon-ui/LemonDivider/LemonDivider.scss'
import '../../src/lib/lemon-ui/LemonTable/LemonTable.scss'
import '../../frontend/src/lib/ui/Button/ButtonPrimitives.scss'
import '../../frontend/src/lib/components/ScrollableShadows/ScrollableShadows.scss'
import '../../frontend/src/scenes/notebooks/Notebook/Notebook.scss'
import '../../frontend/src/scenes/notebooks/NotebookPanel/NotebookPanel.scss'

// Tailwind + PostHog CSS tokens + gallery overrides
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
