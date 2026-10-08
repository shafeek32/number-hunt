import { Navigate } from 'react-router-dom';

/**
 * Legacy Admin Route Redirect
 * Number Hunt Admin suite has been upgraded to modular routes under /admin/*
 */
export function Admin() {
  return <Navigate to="/admin" replace />;
}
