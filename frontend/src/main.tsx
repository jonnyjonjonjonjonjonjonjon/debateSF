import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './pages/App'
import DebateView from './pages/DebateView'
import './index.css'
import { initializeCSSVariables } from './design/tokens'

initializeCSSVariables();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/debate/:id" element={<DebateView />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)