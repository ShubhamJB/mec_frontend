import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RoleGuard } from './auth/RoleGuard';

import { LandingPage } from './features/discovery/LandingPage';
import { Landing3DPage } from './features/landing3d/Landing3DPage';
import { DiscoveryPage } from './features/discovery/DiscoveryPage';
import { GarageProfilePage } from './features/garage-profile/GarageProfilePage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { VerifyEmailPage } from './features/auth/VerifyEmailPage';
import { NotificationsPage } from './features/notifications/NotificationsPage';

import { OwnerDashboardPage } from './features/owner/OwnerDashboardPage';
import { OwnerHoursPage } from './features/owner/OwnerHoursPage';
import { OwnerRegistrationPage } from './features/owner/OwnerRegistrationPage';
import { OwnerPhotosPage } from './features/owner/OwnerPhotosPage';
import { OwnerServicesPage } from './features/owner/OwnerServicesPage';
import { OwnerStaffPage } from './features/owner/OwnerStaffPage';
import { OwnerRoadsidePage } from './features/owner/OwnerRoadsidePage';
import { CustomerRoadsidePage } from './features/roadside/CustomerRoadsidePage';

import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminRegistrationsPage } from './features/admin/AdminRegistrationsPage';
import { GlobalLoadingSpinner } from './components/GlobalLoadingSpinner';
import { ToastProvider } from './components/ToastProvider';

const AdminLoginRedirect: React.FC = () => {
  const { search } = useLocation();
  return <Navigate to={`/login${search}`} replace />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <GlobalLoadingSpinner />
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Landing3DPage />} />
          <Route path="/find" element={<LandingPage />} />
          <Route path="/garages" element={<DiscoveryPage />} />
          <Route path="/garages/:id" element={<GarageProfilePage />} />
          <Route path="/roadside" element={<CustomerRoadsidePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginRedirect />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />

          {/* Authenticated Customer Routes */}
          <Route
            path="/notifications"
            element={
              <RoleGuard allowedRoles={['CUSTOMER', 'GARAGE_OWNER', 'ADMIN']}>
                <NotificationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/account"
            element={
              <RoleGuard allowedRoles={['CUSTOMER', 'GARAGE_OWNER', 'ADMIN']}>
                <div style={{ maxWidth: '600px', margin: '40px auto', padding: '24px' }}>
                  <h1>Customer Account</h1>
                  <p style={{ color: 'var(--muted)', marginTop: '8px' }}>
                    Profile settings and personal reviews are managed here.
                  </p>
                </div>
              </RoleGuard>
            }
          />

          {/* Owner App Routes */}
          <Route
            path="/owner"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerDashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="/owner/registration"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerRegistrationPage />
              </RoleGuard>
            }
          />
          <Route
            path="/owner/hours"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerHoursPage />
              </RoleGuard>
            }
          />
          <Route
            path="/owner/photos"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerPhotosPage />
              </RoleGuard>
            }
          />
          <Route
            path="/owner/services"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerServicesPage />
              </RoleGuard>
            }
          />
          <Route
            path="/owner/staff"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerStaffPage />
              </RoleGuard>
            }
          />
          <Route
            path="/owner/roadside"
            element={
              <RoleGuard allowedRoles={['GARAGE_OWNER']}>
                <OwnerRoadsidePage />
              </RoleGuard>
            }
          />
          <Route path="/owner/*" element={<Navigate to="/owner" replace />} />

          {/* Admin App Routes */}
          <Route
            path="/admin"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/registrations"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminRegistrationsPage />
              </RoleGuard>
            }
          />
          <Route
            path="/admin/*"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminDashboardPage />
              </RoleGuard>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};
