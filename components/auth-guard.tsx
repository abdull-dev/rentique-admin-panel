"use client";

import { useEffect, useState, type FormEvent } from "react";
import api from "@/lib/api";
import { type Profile, UserRole } from "@/lib/types";

type AuthState = "loading" | "authenticated" | "denied" | "unauthenticated";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>("loading");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  function checkProfile() {
    api
      .get("/auth/me")
      .then((res) => {
        const user: Profile = res.data.profile ?? res.data;
        setProfile(user);

        const isAdmin =
          user.roles.includes(UserRole.ADMIN) ||
          user.roles.includes(UserRole.MODERATOR);

        setState(isAdmin ? "authenticated" : "denied");
      })
      .catch(() => {
        setState("unauthenticated");
      });
  }

  useEffect(() => {
    checkProfile();
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);

    try {
      await api.post("/auth/login", { email, password });
      setState("loading");
      checkProfile();
    } catch (err: any) {
      const msg =
        err.response?.data?.message || "Invalid email or password";
      setLoginError(msg);
    } finally {
      setLoggingIn(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-gray-900">Rentique Admin</h1>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access the admin dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="admin@rentique.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p className="text-sm text-red-600">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Access Denied
          </h1>
          <p className="mt-2 text-gray-600">
            You do not have admin or moderator privileges.
          </p>
          {profile && (
            <p className="mt-1 text-sm text-gray-400">
              Signed in as {profile.email ?? profile.name ?? profile.id}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
