import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute, { AdminRoute } from './components/ProtectedRoute'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Ordres from './pages/Ordres'
import Injections from './pages/Injections'
import Ventes from './pages/Ventes'
import Actifs from './pages/Actifs'
import FinanceDashboard from './pages/finance/FinanceDashboard'
import FinanceMois from './pages/finance/FinanceMois'
import FinanceMoisDetail from './pages/finance/FinanceMoisDetail'
import FinanceFactures from './pages/finance/FinanceFactures'
import FinancePlacements from './pages/finance/FinancePlacements'
import Admin from './pages/Admin'

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
        <Route path="/finance" element={<ProtectedRoute><FinanceDashboard /></ProtectedRoute>} />
        <Route path="/finance/mois" element={<ProtectedRoute><FinanceMois /></ProtectedRoute>} />
        <Route path="/finance/mois/:id" element={<ProtectedRoute><FinanceMoisDetail /></ProtectedRoute>} />
        <Route path="/finance/factures" element={<ProtectedRoute><FinanceFactures /></ProtectedRoute>} />
        <Route path="/finance/placements" element={<ProtectedRoute><FinancePlacements /></ProtectedRoute>} />
        <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
