import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'
import AdminLogin from './components/AdminLogin'
import { AdminProvider, useAdmin } from './context/AdminContext'
import OverviewPage from './pages/OverviewPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/SettingsPage'
import VideosPage from './pages/VideosPage'
import UsersPage from './pages/UsersPage'
import SecurityPage from './pages/SecurityPage'
import './App.css'

function ProtectedRoute() {
  const { session } = useAdmin()
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

function PublicRoute() {
  const { session } = useAdmin()
  return session ? <Navigate to="/admin" replace /> : <Outlet />
}

export default function App() {
  return <BrowserRouter><AdminProvider><Routes><Route element={<PublicRoute />}><Route path="/login" element={<AdminLogin />} /></Route><Route element={<ProtectedRoute />}><Route path="/admin" element={<AdminLayout />}><Route index element={<OverviewPage />} /><Route path="payments" element={<PaymentsPage />} /><Route path="videos" element={<VideosPage />} /><Route path="users" element={<UsersPage />} /><Route path="security" element={<SecurityPage />} /><Route path="settings" element={<SettingsPage />} /></Route></Route><Route path="*" element={<Navigate to="/admin" replace />} /></Routes></AdminProvider></BrowserRouter>
}