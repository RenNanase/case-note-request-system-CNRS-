import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import RequestsPage from '@/pages/RequestsPage';
import CreateRequestPage from '@/pages/CreateRequestPage';
import RequestDetailsPage from '@/pages/RequestDetailsPage';
import AdminPatientsPage from '@/pages/AdminPatientsPage';
import MyRequestsPage from '@/pages/MyRequestsPage';
import AdminCaseNoteSearchPage from '@/pages/AdminCaseNoteSearchPage';
import { BatchRequestsPage } from '@/pages/BatchRequestsPage';
import IndividualRequestsPage from '@/pages/IndividualRequestsPage';
import VerifyCaseNotesPage from '@/pages/VerifyCaseNotesPage';
import ReturnCaseNotesPage from '@/pages/ReturnCaseNotesPage';
import MRStaffCaseNoteRequestsPage from '@/pages/MRStaffCaseNoteRequestsPage';
import MRStaffReturnedCaseNotesPage from '@/pages/MRStaffReturnedCaseNotesPage';
import CaseNoteTimelinePage from '@/pages/CaseNoteTimelinePage';
import CaseNoteTrackingPage from '@/pages/CaseNoteTrackingPage';
import OpenNewCaseNotePage from '@/pages/OpenNewCaseNotePage';
import HandoverRequestsPage from '@/pages/HandoverRequestsPage';
import DoctorManagementPage from '@/pages/DoctorManagementPage';
import UserManagementPage from '@/pages/UserManagementPage';

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <img src="/CNRS/cnrs.logo.png" alt="CNRS Logo" className="h-12 w-auto" />
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading CNRS...</p>
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
    <Router basename="/CNRS">
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
          <Route path="admin/patients" element={<AdminPatientsPage />} />
          <Route path="admin/doctors" element={<DoctorManagementPage />} />
          <Route path="admin/case-note-search" element={<AdminCaseNoteSearchPage />} />
          <Route path="users" element={<UserManagementPage />} />
          <Route path="batch-requests" element={<BatchRequestsPage />} />
          <Route path="batch-requests/:id" element={<BatchRequestsPage />} />
          <Route path="individual-requests" element={<IndividualRequestsPage />} />
          <Route path="individual-requests/:id" element={<IndividualRequestsPage />} />
          <Route path="verify-case-notes" element={<VerifyCaseNotesPage />} />
          <Route path="return-case-notes" element={<ReturnCaseNotesPage />} />
          <Route path="mrs-case-note-requests" element={<MRStaffCaseNoteRequestsPage />} />
          <Route path="mrs-returned-case-notes" element={<MRStaffReturnedCaseNotesPage />} />
          <Route path="case-note-timeline" element={<CaseNoteTimelinePage />} />
          <Route path="case-note-tracking" element={<CaseNoteTrackingPage />} />
          <Route path="open-new-case-note" element={<OpenNewCaseNotePage />} />
          <Route path="handover-requests" element={<HandoverRequestsPage />} />
          <Route index element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

// Root App component with providers
// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
          <Toaster />
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
