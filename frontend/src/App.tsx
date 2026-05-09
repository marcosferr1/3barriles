import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, bootstrapped } = useAuth();
  if (!bootstrapped) return null;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { bootstrapped } = useAuth();
  void bootstrapped;

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app/*"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
