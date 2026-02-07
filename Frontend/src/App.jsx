import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from './auth/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PublicOnlyRoute from './components/PublicOnlyRoute.jsx';

import Home from './pages/Home.jsx';
import Demo from './pages/Demo.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Reports from './pages/Reports.jsx';
import ReportPage from './pages/ReportPage.jsx';
import Upload from './pages/Upload.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import DetailedAnalysis from './pages/DetailedAnalysis.jsx';
import PersonalizedPlan from './pages/PersonalizedPlan.jsx';

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Public routes - redirect to /app if logged in */}
        <Route
          path="/"
          element={
            <PublicOnlyRoute>
              <Home />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/demo"
          element={
            <PublicOnlyRoute>
              <Demo />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicOnlyRoute>
              <Signup />
            </PublicOnlyRoute>
          }
        />

        {/* Auth callback route for email confirmation */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes - redirect to /login if not logged in */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analysis/:analysisId"
          element={
            <ProtectedRoute>
              <DetailedAnalysis />
            </ProtectedRoute>
          }
        />
        <Route
          path="/plan/:analysisId"
          element={
            <ProtectedRoute>
              <PersonalizedPlan />
            </ProtectedRoute>
          }
        />
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <ReportPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
