"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { login, token, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && token) {
      router.push("/");
    }
  }, [loading, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(username, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-800 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">SmartStore POS</h1>
          <p className="mt-2 text-blue-200">Inventory & Cashier System</p>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-xl font-semibold text-gray-800">
            Sign In
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Enter username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                placeholder="Enter password"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-blue-200">
          SmartStore POS &copy; 2026
        </p>
      </div>
    </div>
  );
}
