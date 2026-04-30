import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth.js";
import { LandingPage } from "./pages/LandingPage.js";
import { LoginPage } from "./pages/LoginPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage.js";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.js";
import { OnboardingPage } from "./pages/OnboardingPage.js";
import { DashboardPage } from "./pages/DashboardPage.js";
import { WorkspacePage } from "./pages/WorkspacePage.js";
import { CollectionPage } from "./pages/CollectionPage.js";
import { EntryPage } from "./pages/EntryPage.js";
import { SettingsPage } from "./pages/SettingsPage.js";
import { AcceptInvitePage } from "./pages/AcceptInvitePage.js";
import { DocsToolsPage } from "./pages/DocsToolsPage.js";
import { SecurityPage } from "./pages/SecurityPage.js";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  if (session) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function HomePage() {
  const { session } = useAuth();
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        {/* Docs are public — engineers and security teams want to read
            them before signing up. */}
        <Route path="/docs" element={<DocsToolsPage />} />
        <Route path="/docs/tools" element={<DocsToolsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route
          path="/login"
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          }
        />
        <Route
          path="/register"
          element={
            <AuthRoute>
              <RegisterPage />
            </AuthRoute>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <AuthRoute>
              <ForgotPasswordPage />
            </AuthRoute>
          }
        />
        {/* Reset-password is intentionally public. When Supabase lands the
            user here via the email link, they have a temporary recovery
            session — AuthRoute would bounce them to /dashboard. */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/w/:id"
          element={
            <ProtectedRoute>
              <WorkspacePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/w/:workspaceId/c/:collectionId"
          element={
            <ProtectedRoute>
              <CollectionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/w/:workspaceId/c/:collectionId/entry/:entryId"
          element={
            <ProtectedRoute>
              <EntryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/w/:id/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invite/accept"
          element={
            <ProtectedRoute>
              <AcceptInvitePage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
