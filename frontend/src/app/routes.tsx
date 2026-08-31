import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import App from './App';
import { AuthProvider, ToastProvider, useAuth } from './admin/admin-context';
import { AdminLayout } from './admin/AdminLayout';
import { LoginPage } from './admin/LoginPage';
import { ForgotPasswordPage } from './admin/ForgotPasswordPage';
import { ResetPasswordPage } from './admin/ResetPasswordPage';
import { OverviewPage } from './admin/OverviewPage';
import { GalleryPage } from './admin/GalleryPage';
import { AnnouncementsPage } from './admin/AnnouncementsPage';
import { CoursesPage } from './admin/CoursesPage';
import { TestimonialsPage } from './admin/TestimonialsPage';
import { HeroPage } from './admin/HeroPage';
import { FeaturesPage } from './admin/FeaturesPage';
import { SettingsPage } from './admin/SettingsPage';
import { InboxPage } from './admin/InboxPage';
import { ProfilePage } from './admin/ProfilePage';
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

            {/* Signed-out routes. Reset links arrive by email, so these have to
                be reachable without a session. */}
            <Route path="/admin/login" element={<LoginPage />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/admin/reset-password" element={<ResetPasswordPage />} />

            <Route
              path="/admin"
              element={
                <RequireAuth>
                  <AdminLayout />
                </RequireAuth>
              }
            >
              <Route index element={<OverviewPage />} />
              <Route path="hero" element={<HeroPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="gallery" element={<GalleryPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="testimonials" element={<TestimonialsPage />} />
              <Route path="features" element={<FeaturesPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />
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
