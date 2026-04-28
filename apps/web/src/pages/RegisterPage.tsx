import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { SocialAuth } from "../components/SocialAuth.js";

export function RegisterPage() {
  const { register, resendConfirmation } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendState, setResendState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [resendError, setResendError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await register(email, password, name || undefined);
      if (result.needsEmailConfirmation) {
        // Stay on this page and show a "check your inbox" state. When the
        // user clicks the email link, Supabase bounces them back to
        // SITE_URL (which we set to http://localhost:5173 in dev), the
        // Supabase JS client parses the hash, a session appears, and the
        // HomePage protected route sends them on to /dashboard.
        setPendingEmail(email);
      } else {
        // Email confirmation disabled — go straight in.
        navigate("/dashboard");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendState("sending");
    setResendError("");
    try {
      await resendConfirmation(pendingEmail);
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 4000);
    } catch (err: any) {
      setResendError(err.message || "Couldn't resend. Try again in a moment.");
      setResendState("error");
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
            Sign in
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          {pendingEmail ? (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-3">
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Check your inbox
                </h1>
                <p className="text-sm text-gray-500">
                  We sent a confirmation link to{" "}
                  <span className="font-medium text-gray-800">
                    {pendingEmail}
                  </span>
                  . Click it to finish creating your account.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 space-y-2">
                <p>
                  <span className="font-medium text-gray-800">
                    Tip:
                  </span>{" "}
                  open the link on this device so you go straight to the
                  app. The link expires in 24 hours.
                </p>
                <p>
                  Didn't arrive? Check spam, or resend below.
                </p>
              </div>

              <button
                onClick={handleResend}
                disabled={resendState === "sending"}
                className="mt-4 w-full border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {resendState === "sending"
                  ? "Resending..."
                  : resendState === "sent"
                    ? "Sent — check your inbox"
                    : "Resend confirmation email"}
              </button>

              {resendState === "error" && (
                <p className="mt-2 text-xs text-red-600 text-center">
                  {resendError}
                </p>
              )}

              <button
                onClick={() => {
                  setPendingEmail(null);
                  setResendState("idle");
                  setEmail("");
                }}
                className="mt-3 w-full text-gray-500 py-2 text-sm hover:text-gray-700"
              >
                Use a different email
              </button>

              <p className="mt-6 text-center text-sm text-gray-500">
                Already confirmed?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Create your account
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Connect your database in 5 minutes. Free while in beta.
              </p>

              <SocialAuth />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">
                    or sign up with email
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    {error}
                  </div>
                )}
                <label className="block mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </label>
                <label className="block mb-4">
                  <span className="text-sm font-medium text-gray-700">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@company.com"
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </label>
                <label className="block mb-6">
                  <span className="text-sm font-medium text-gray-700">
                    Password
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min 8 characters"
                    className="mt-1 block w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Creating account..." : "Create account"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-blue-600 font-medium hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
