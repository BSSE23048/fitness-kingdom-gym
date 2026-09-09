import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/protected/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PageSkeletonLoader from './components/ui/PageSkeletonLoader';

// Code-Split Route Page Imports via React.lazy()
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const FeeCollection = lazy(() => import('./pages/FeeCollection'));
const Financials = lazy(() => import('./pages/Financials'));
const Staff = lazy(() => import('./pages/Staff'));
const Attendance = lazy(() => import('./pages/Attendance'));
const Workouts = lazy(() => import('./pages/Workouts'));
const SettingsView = lazy(() => import('./components/settings/SettingsView'));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageSkeletonLoader />}>
          <Routes>
            {/* Public Authentication Route */}
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Protected Owner Portal App Shell Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['OWNER']}>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/fee-collection" element={<FeeCollection />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/financials" element={<Financials />} />
              <Route path="/staff" element={<Staff />} />
              <Route path="/workouts" element={<Workouts />} />
              <Route path="/settings" element={<SettingsView />} />
            </Route>

            {/* Fallback Catch-All */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
