import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Ordres from './pages/Ordres'
import Injections from './pages/Injections'
import Ventes from './pages/Ventes'
import Actifs from './pages/Actifs'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ordres" element={<ProtectedRoute><Ordres /></ProtectedRoute>} />
        <Route path="/injections" element={<ProtectedRoute><Injections /></ProtectedRoute>} />
        <Route path="/ventes" element={<ProtectedRoute><Ventes /></ProtectedRoute>} />
        <Route path="/actifs" element={<ProtectedRoute><Actifs /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
