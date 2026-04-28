import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth.js";

export function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      // Always show success — never confirm whether the email is registered.
      // This avoids leaking a list of valid accounts to someone who's
      // probing the form.
      setSent(true);
    } catch (err: any) {
      // Supabase-rate-limit / network errors are still surfaced.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900">
            TeamMem
          </Link>
          <Link
            to="/login"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to sign in
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Reset your password
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            We'll send you a reset link. It'll expire in an hour.
          </p>

          {sent ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-sm font-medium text-green-900">
                Check your inbox
              </p>
              <p className="text-sm text-green-800 mt-1">
                If an account exists for <strong>{email}</strong>, we've sent
                a password reset link. It may take a minute to arrive.
              </p>
              <p className="text-xs text-green-700 mt-3">
                Didn't get it? Check spam, or{" "}
                <button
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="underline font-medium hover:text-green-900"
                >
                  try a different email
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  {error}
                </div>
              )}
              <label className="block mb-6">
                <span className="text-sm font-medium text-gray-700">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="you@company.com"
                  className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Remembered it?{" "}
            <Link
              to="/login"
              className="text-blue-600 font-medium hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
