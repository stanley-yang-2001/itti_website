import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 *   <ProtectedRoute><Dashboard /></ProtectedRoute>
 *   <ProtectedRoute requireRole="publisher"><Publish /></ProtectedRoute>
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // could swap for a spinner

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  // admin satisfies any requireRole - mirrors the backend, where every
  // @roles_required("publisher", ...) route also allows "admin" (see
  // docs/ACCESS_LEVELS.md: admin can do everything publisher can).
  if (requireRole && user?.role !== requireRole && user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}