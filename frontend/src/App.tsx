import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'

import Landing from './pages/Landing'
import MerchantLogin from './pages/merchant/Login'
import MerchantRegister from './pages/merchant/Register'
import SafeStandards from './pages/merchant/SafeStandards'
import Dashboard from './pages/merchant/Dashboard'
import Orders from './pages/merchant/Orders'
import OrderDetail from './pages/merchant/OrderDetail'
import CreateOrder from './pages/merchant/CreateOrder'
import Statistics from './pages/merchant/Statistics'
import Insights from './pages/merchant/Insights'
import CustomerOrder from './pages/customer/OrderPage'
import TrackOrder from './pages/customer/TrackOrder'
import CustomerHome from './pages/customer/Home'
import CustomerLogin from './pages/customer/Login'
import PasteLink from './pages/customer/PasteLink'
import AdminDashboard from './pages/admin/Dashboard'
import MerchantLayout from './components/layout/MerchantLayout'

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  if (isLoading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/merchant/login" replace />
  if (role && user?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      {/* Merchant Auth */}
      <Route path="/merchant/login" element={<MerchantLogin />} />
      <Route path="/merchant/register" element={<MerchantRegister />} />
      <Route path="/merchant/safe-standards" element={<ProtectedRoute role="merchant"><SafeStandards /></ProtectedRoute>} />

      {/* Merchant Dashboard */}
      <Route path="/merchant" element={<ProtectedRoute role="merchant"><MerchantLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="create-order" element={<CreateOrder />} />
        <Route path="stats" element={<Statistics />} />
        <Route path="insights" element={<Insights />} />
      </Route>

      {/* Customer */}
      <Route path="/order/:token" element={<CustomerOrder />} />
      <Route path="/order" element={<PasteLink />} />
      <Route path="/track/:code" element={<TrackOrder />} />
      <Route path="/track" element={<TrackOrder />} />
      <Route path="/customer" element={<CustomerHome />} />
      <Route path="/customer/login" element={<CustomerLogin />} />
      <Route path="/customer/register" element={<CustomerLogin />} />

      {/* Admin */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
