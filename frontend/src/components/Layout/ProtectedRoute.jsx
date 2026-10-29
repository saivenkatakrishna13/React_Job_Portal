import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { Context } from '../../main';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { isAuthorized, user, authLoading } = useContext(Context);

  if (authLoading) {
    return (
      <div className="min-h-[60vh] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
