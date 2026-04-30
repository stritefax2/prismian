import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { supabase } from "../lib/supabase.js";

// Entry point after the user clicks the email reset link. Supabase lands
// them here with a "recovery" session on the URL hash, which @supabase/
// supabase-js automatically parses into a session. The user is technically
// "logged in" for this short window — we use it to update the password
// without a current-password prompt, then redirect to the dashboard.

export function ResetPasswordPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase parses the hash automatically, but we wait for the session
    // to settle before deciding whether the link is valid.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasRecoverySession(Boolean(session));
      setReady(true);
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await updatePassword(newPassword);
      // Force a clean sign-out so they log in again with the new password,
      // which also invalidates any devices still using the old refresh token.
      await supabase.auth.signOut({ scope: "global" });
      navigate("/login?reset=1");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400 animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Prismian
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Set a new password
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Use at least 8 characters. Avoid reusing old passwords.
          </p>

          {!hasRecoverySession ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-medium text-amber-900">
                This reset link has expired or is invalid
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Request a new one from the forgot-password page.
              </p>
              <Link
                to="/forgot-password"
                className="mt-3 inline-block text-sm text-amber-900 underline font-medium hover:text-amber-700"
              >
                Send a new link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
                </div>
              )}
              <label className="block mb-4">
                <span className="text-sm font-medium text-gray-700">
                  New password
                </span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                  placeholder="At least 8 characters"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                />
              </label>
              <label className="block mb-6">
                <span className="text-sm font-medium text-gray-700">
                  Confirm new password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full bg-gray-900 text-white py-2.5 rounded-md font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
              <p className="mt-4 text-xs text-gray-500">
                For your security we'll sign you out of all devices after
                the password change.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
