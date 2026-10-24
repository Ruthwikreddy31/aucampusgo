import { BrowserRouter, Route, Navigate } from 'react-router-dom'
import AnimatedRoutes from './components/AnimatedRoutes'
import { Toaster } from 'sonner'
import { useEffect } from 'react'
import { useAuthStore } from './store/authStore'

// Route guards
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'

// Layouts
import StudentLayout from './layouts/StudentLayout'
import DeliveryLayout from './layouts/DeliveryLayout'
import ManagerLayout from './layouts/ManagerLayout'
import AdminLayout from './layouts/AdminLayout'

import LoginPage from './pages/LoginPage'
import CampusVerifyPage from './pages/CampusVerifyPage'

// Admin pages
import AdminLoginPage from './pages/admin/AdminLoginPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminDeliveryPartnersPage from './pages/admin/AdminDeliveryPartnersPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminShopsPage from './pages/admin/AdminShopsPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage'
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage'
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage'
import AdminSettingsPage from './pages/admin/AdminSettingsPage'
import AdminAuditLogsPage from './pages/admin/AdminAuditLogsPage'
import AdminProfilePage from './pages/admin/AdminProfilePage'

// Student pages
import HomePage from './pages/student/HomePage'
import CategoryPage from './pages/student/CategoryPage'
import ProductDetailPage from './pages/student/ProductDetailPage'
import ShopsPage from './pages/student/ShopsPage'
import ShopDetailPage from './pages/student/ShopDetailPage'
import CartPage from './pages/student/CartPage'
import CheckoutPage from './pages/student/CheckoutPage'
import OrderConfirmationPage from './pages/student/OrderConfirmationPage'
import OrderTrackingPage from './pages/student/OrderTrackingPage'
import OrdersPage from './pages/student/OrdersPage'
import NotificationsPage from './pages/student/NotificationsPage'
import ProfilePage from './pages/student/ProfilePage'
import PrintPage from './pages/student/PrintPage'

// Delivery pages
import DeliveryLoginPage from './pages/delivery/DeliveryLoginPage'
import DeliveryDashboardPage from './pages/delivery/DeliveryDashboardPage'
import DeliveryOrdersPage from './pages/delivery/DeliveryOrdersPage'
import DeliveryOrderDetailPage from './pages/delivery/DeliveryOrderDetailPage'
import DeliveryHistoryPage from './pages/delivery/DeliveryHistoryPage'
import DeliveryProfilePage from './pages/delivery/DeliveryProfilePage'

// Manager pages
import ManagerLoginPage from './pages/manager/ManagerLoginPage'
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage'
import ManagerShopsPage from './pages/manager/ManagerShopsPage'
import ManagerProductsPage from './pages/manager/ManagerProductsPage'
import ManagerUsersPage from './pages/manager/ManagerUsersPage'
import ManagerAnalyticsPage from './pages/manager/ManagerAnalyticsPage'
import ManagerSettingsPage from './pages/manager/ManagerSettingsPage'
import ManagerDeliveryRequestsPage from './pages/manager/ManagerDeliveryRequestsPage'
import DeliveryRegistrationPage from './pages/delivery/DeliveryRegistrationPage'
import DeliveryApplicationStatusPage from './pages/delivery/DeliveryApplicationStatusPage'
import CanteenManagerPage from './pages/canteen/CanteenManagerPage'
import LoginModal from './components/LoginModal'

function AppRoutes() {
  const { restore } = useAuthStore()

  useEffect(() => {
    restore()
  }, [])

  return (
    <AnimatedRoutes>
      {/* Splash / Landing */}
      <Route path="/" element={<StudentLayout><HomePage /></StudentLayout>} />

      {/* Auth */}
      <Route path="/login" element={
        <PublicOnlyRoute><LoginPage /></PublicOnlyRoute>
      } />

      {/* Campus verify — auth required, campus NOT required */}
      <Route path="/campus-verify" element={<CampusVerifyPage />} />

      {/* ── Student routes ─────────────────────────────────────── */}
      <Route path="/home" element={
        <StudentLayout><HomePage /></StudentLayout>
      } />
      <Route path="/shops" element={
        <StudentLayout><ShopsPage /></StudentLayout>
      } />
      <Route path="/shops/:id" element={
        <StudentLayout><ShopDetailPage /></StudentLayout>
      } />
      <Route path="/search" element={
        <StudentLayout><CategoryPage /></StudentLayout>
      } />
      <Route path="/category/:slug" element={
        <StudentLayout><CategoryPage /></StudentLayout>
      } />
      <Route path="/category/:categoryName" element={
        <StudentLayout><CategoryPage /></StudentLayout>
      } />
      <Route path="/products/:id" element={
        <StudentLayout><ProductDetailPage /></StudentLayout>
      } />
      <Route path="/cart" element={
        <StudentLayout><CartPage /></StudentLayout>
      } />
      <Route path="/checkout" element={
        <StudentLayout><CheckoutPage /></StudentLayout>
      } />
      <Route path="/order-confirmation/:id" element={
        <StudentLayout><OrderConfirmationPage /></StudentLayout>
      } />
      <Route path="/orders" element={
        <ProtectedRoute>
          <StudentLayout><OrdersPage /></StudentLayout>
        </ProtectedRoute>
      } />
      <Route path="/orders/:id" element={
        <ProtectedRoute>
          <StudentLayout><OrderTrackingPage /></StudentLayout>
        </ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute>
          <StudentLayout><NotificationsPage /></StudentLayout>
        </ProtectedRoute>
      } />
      <Route path="/profile" element={
        <ProtectedRoute>
          <StudentLayout><ProfilePage /></StudentLayout>
        </ProtectedRoute>
      } />
      <Route path="/print" element={
        <ProtectedRoute>
          <StudentLayout><PrintPage /></StudentLayout>
        </ProtectedRoute>
      } />

      {/* ── Delivery Partner Registration, Status & Login ────── */}
      <Route path="/delivery/login" element={<DeliveryLoginPage />} />
      <Route path="/delivery/register" element={
        <DeliveryRegistrationPage />
      } />
      <Route path="/delivery/track" element={
        <DeliveryApplicationStatusPage />
      } />
      <Route path="/track-application" element={
        <DeliveryApplicationStatusPage />
      } />
      <Route path="/delivery/status" element={
        <DeliveryApplicationStatusPage />
      } />
      <Route path="/delivery/application-status" element={
        <DeliveryApplicationStatusPage />
      } />

      {/* ── Delivery routes ────────────────────────────────────── */}
      <Route path="/delivery" element={
        <ProtectedRoute roles={['DELIVERY_PARTNER']}>
          <DeliveryLayout><DeliveryDashboardPage /></DeliveryLayout>
        </ProtectedRoute>
      } />
      <Route path="/delivery/orders" element={
        <ProtectedRoute roles={['DELIVERY_PARTNER']}>
          <DeliveryLayout><DeliveryOrdersPage /></DeliveryLayout>
        </ProtectedRoute>
      } />
      <Route path="/delivery/orders/:id" element={
        <ProtectedRoute roles={['DELIVERY_PARTNER']}>
          <DeliveryLayout><DeliveryOrderDetailPage /></DeliveryLayout>
        </ProtectedRoute>
      } />
      <Route path="/delivery/history" element={
        <ProtectedRoute roles={['DELIVERY_PARTNER']}>
          <DeliveryLayout><DeliveryHistoryPage /></DeliveryLayout>
        </ProtectedRoute>
      } />
      <Route path="/delivery/profile" element={
        <ProtectedRoute roles={['DELIVERY_PARTNER']}>
          <DeliveryLayout><DeliveryProfilePage /></DeliveryLayout>
        </ProtectedRoute>
      } />

      {/* ── Manager routes ─────────────────────────────────────── */}
      <Route path="/canteen" element={
        <ProtectedRoute roles={['ADMIN', 'CANTEEN_MEMBER']}>
          <ManagerLayout><CanteenManagerPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/canteen/orders" element={
        <ProtectedRoute roles={['ADMIN', 'CANTEEN_MEMBER']}>
          <ManagerLayout><CanteenManagerPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager" element={
        <ProtectedRoute roles={['ADMIN', 'CANTEEN_MEMBER']}>
          <ManagerLayout><ManagerDashboardPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/delivery-requests" element={
        <ProtectedRoute roles={['ADMIN', 'CANTEEN_MEMBER']}>
          <ManagerLayout><ManagerDeliveryRequestsPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/delivery-partners" element={
        <ProtectedRoute roles={['ADMIN', 'CANTEEN_MEMBER']}>
          <ManagerLayout><ManagerDeliveryRequestsPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/orders" element={
        <ProtectedRoute roles={['ADMIN', 'CANTEEN_MEMBER']}>
          <ManagerLayout><CanteenManagerPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/shops" element={
        <ProtectedRoute roles={['ADMIN']}>
          <ManagerLayout><ManagerShopsPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/products" element={
        <ProtectedRoute roles={['ADMIN']}>
          <ManagerLayout><ManagerProductsPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/users" element={
        <ProtectedRoute roles={['ADMIN']}>
          <ManagerLayout><ManagerUsersPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/analytics" element={
        <ProtectedRoute roles={['ADMIN']}>
          <ManagerLayout><ManagerAnalyticsPage /></ManagerLayout>
        </ProtectedRoute>
      } />
      <Route path="/manager/settings" element={
        <ProtectedRoute roles={['ADMIN']}>
          <ManagerLayout><ManagerSettingsPage /></ManagerLayout>
        </ProtectedRoute>
      } />

      {/* ── Manager dedicated login ──────────────────────────── */}
      <Route path="/manager/login" element={<ManagerLoginPage />} />

      {/* ── Admin dedicated login ─────────────────────────────── */}
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* ── Admin Portal routes ─────────────────────────────────── */}
      <Route path="/admin" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminDashboardPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/delivery-requests" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><ManagerDeliveryRequestsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/delivery-partners" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminDeliveryPartnersPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminUsersPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/shops" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminShopsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/products" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminProductsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/categories" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminCategoriesPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/orders" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminOrdersPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/payments" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminPaymentsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/complaints" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminComplaintsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/notifications" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminNotificationsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/analytics" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminAnalyticsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/settings" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminSettingsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/audit-logs" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminAuditLogsPage /></AdminLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/profile" element={
        <ProtectedRoute roles={['ADMIN']}>
          <AdminLayout><AdminProfilePage /></AdminLayout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </AnimatedRoutes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <LoginModal />
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A1030',
            border: '1px solid rgba(108,60,225,0.3)',
            color: '#F1F0F7',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
        }}
        richColors
      />
    </BrowserRouter>
  )
}
