import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import './theme/cyber-gourmet.css';
import { initTheme } from './theme';
import App from './App.tsx'
import Widget from './pages/Widget.tsx'
import { SettingsProvider } from './contexts/SettingsContext'

initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/widget" element={<Widget />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  </StrictMode>,
)
