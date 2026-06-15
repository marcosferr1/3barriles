import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import { RouteNavigationEffects } from './components/RouteNavigationEffects';
import { isBackOn } from './config/backOn';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { token, bootstrapped } = useAuth();
  if (!bootstrapped) return null;
  if (!isBackOn || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { bootstrapped } = useAuth();
  void bootstrapped;

  return (
    <>
      <RouteNavigationEffects />
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
      <Route path="*" element={<Navigate to={isBackOn ? '/app' : '/login'} replace />} />
      </Routes>
    </>
  );
}
