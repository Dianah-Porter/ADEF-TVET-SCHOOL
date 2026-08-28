import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import App from './App';
import { AuthProvider, ToastProvider, useAuth } from './admin/admin-context';
import { AdminLayout } from './admin/AdminLayout';
import { LoginPage } from './admin/LoginPage';
import { OverviewPage } from './admin/OverviewPage';
import { GalleryPage } from './admin/GalleryPage';
import { AnnouncementsPage } from './admin/AnnouncementsPage';
import { Spinner, Toaster } from './admin/ui';

/**
 * The public site is mounted here unchanged — App.tsx is imported as the "/"
 * element rather than edited, so adding the dashboard cannot alter a single
 * pixel of the website itself.
 */
export function AppRoutes() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<App />} />

            <Route path="/admin/login" element={<LoginPage />} />

            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
            </Route>

            {/* Anything unrecognised belongs to the public site. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  // Without this the dashboard would flash the login screen on every reload
  // while the session is being restored from the refresh cookie.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner label="Restoring your session" />
      </div>
    );
  }

  if (!user) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
