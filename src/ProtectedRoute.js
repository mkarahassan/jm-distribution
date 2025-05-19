// src/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from './firebase';
import styles from './ProtectedRoute.module.css'; // Import CSS Module

const ProtectedRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return (
      <div className={styles.loadingMessage}>
        <div className="loading-spinner"></div> {/* Use global spinner */}
        {/* Loading... */} {/* Text can be omitted if spinner is enough */}
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

export default ProtectedRoute;