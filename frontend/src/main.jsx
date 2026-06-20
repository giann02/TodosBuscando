import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Register from './pages/Register'
import Reporte from './pages/Reporte'
import AdminDashboard from './pages/AdminDashboard'
import AdminLogin from './pages/AdminLogin'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/ProtectedRoute'
import 'leaflet/dist/leaflet.css'
import './index.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/"            element={<Home />} />
      <Route path="/registrar"   element={<Register />} />
      <Route path="/reporte/:id" element={<Reporte />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin"       element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="*"            element={<NotFound />} />
    </Routes>
  </BrowserRouter>
)
