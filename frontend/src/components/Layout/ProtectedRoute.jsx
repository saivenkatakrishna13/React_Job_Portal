import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Context } from '../../main';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthorized, user } = useContext(Context);

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
