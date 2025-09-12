import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import DebateView from './pages/DebateView'
import { AdminPage } from './pages/AdminPage'
import { HomePage } from './pages/HomePage'
import './index.css'
import { initializeCSSVariables } from './design/tokens'

const NotFoundPage = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
    <div className="max-w-md w-full text-center">
      <Link 
        to="/" 
        className="inline-block mb-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        ← Back to Home
      </Link>
      <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-8">
        The page you're looking for doesn't exist or may have been moved.
      </p>
    </div>
  </div>
)

initializeCSSVariables();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/debate/:id" element={<DebateView />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)