import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/auth.js";
import { SocialAuth } from "../components/SocialAuth.js";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const justReset = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err: any) {
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
            Prismian
          </Link>
          <Link
            to="/register"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Create account
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Sign in to your Prismian account
          </p>

          <SocialAuth />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {justReset && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm">
                Password updated. Sign in with your new password.
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                {error}
              </div>
            )}
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
              />
            </label>
            <label className="block mb-2">
              <span className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Password
                </span>
                <Link
                  to="/forgot-password"
                  className="text-xs text-gray-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm focus:border-gray-900 focus:ring-1 focus:ring-gray-900 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full bg-gray-900 text-white py-2.5 rounded-md font-medium text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-gray-900 font-medium hover:underline"
            >
              Get started free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
