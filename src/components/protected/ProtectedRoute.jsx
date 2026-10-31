import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute component for RBAC routing.
 * Checks the owner session resolved from Firebase Auth token claims.
 */
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-emerald-100/60 overflow-hidden pointer-events-none">
        <div className="h-full bg-emerald-600 animate-pulse w-full origin-left transition-all duration-300"></div>
      </div>
    );
  }

  // Profile data alone cannot restore a session.
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check -> if allowedRoles is specified and user's role is not included, redirect to unauthorized page
  if (allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
