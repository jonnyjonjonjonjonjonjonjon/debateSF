import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DebateView from './pages/DebateView'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import './index.css'
import { initializeCSSVariables } from './design/tokens'

initializeCSSVariables();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/debate/:id" element={<DebateView />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)