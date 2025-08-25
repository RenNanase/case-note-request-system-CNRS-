import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import RequestsPage from '@/pages/RequestsPage';
import CreateRequestPage from '@/pages/CreateRequestPage';
import RequestDetailsPage from '@/pages/RequestDetailsPage';
import PatientSearchPage from '@/pages/PatientSearchPage';
import AdminPatientsPage from '@/pages/AdminPatientsPage';
import MyRequestsPage from '@/pages/MyRequestsPage';
import AdminCaseNoteSearchPage from '@/pages/AdminCaseNoteSearchPage';
import { BatchRequestsPage } from '@/pages/BatchRequestsPage';
import VerifyCaseNotesPage from '@/pages/VerifyCaseNotesPage';
import HandoverCaseNotesPage from '@/pages/HandoverCaseNotesPage';

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">CNRS</h2>
        <p className="text-gray-600">Loading Case Note Request System...</p>
      </div>
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// Public Route component (redirects if already authenticated)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// Main App content with routing
function AppContent() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        } />

        {/* Protected routes - wrapped in AppLayout */}
        <Route path="/" element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/new" element={<CreateRequestPage />} />
          <Route path="requests/:id" element={<RequestDetailsPage />} />
          <Route path="my-requests" element={<MyRequestsPage />} />
          <Route path="patients" element={<PatientSearchPage />} />
          <Route path="admin/patients" element={<AdminPatientsPage />} />
          <Route path="admin/case-note-search" element={<AdminCaseNoteSearchPage />} />
          <Route path="batch-requests" element={<BatchRequestsPage />} />
          <Route path="batch-requests/:id" element={<BatchRequestsPage />} />
          <Route path="verify-case-notes" element={<VerifyCaseNotesPage />} />
          <Route path="handover-case-notes" element={<HandoverCaseNotesPage />} />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

// Root App component with providers
function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
        <Toaster />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
