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
    api.get("/auth/me")
      .then((res) => {
        const user: Profile = res.data.profile ?? res.data;
        setProfile(user);
        const isAdmin = user.roles.includes(UserRole.ADMIN) || user.roles.includes(UserRole.MODERATOR);
        setState(isAdmin ? "authenticated" : "denied");
      })
      .catch(() => setState("unauthenticated"));
  }

  useEffect(() => { checkProfile(); }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoggingIn(true);
    try {
      await api.post("/auth/login", { email, password });
      setState("loading");
      checkProfile();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Invalid email or password";
      setLoginError(msg);
    } finally {
      setLoggingIn(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#FFFCF6" }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="h-9 w-9 rounded-full border-4 border-transparent animate-spin"
            style={{ borderTopColor: "#D6336C", borderRightColor: "#FCE3ED" }}
          />
          <p className="text-sm" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>Loading…</p>
        </div>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return (
      <div className="flex h-screen">
        {/* Left brand panel */}
        <div
          className="hidden lg:flex lg:w-[420px] shrink-0 flex-col justify-between p-10 relative overflow-hidden"
          style={{ background: "#0F0A14" }}
        >
          {/* Decorative blobs */}
          <div style={{ position: "absolute", top: -80, right: -80, width: 280, height: 280, borderRadius: "50%", background: "rgba(214,51,108,0.12)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: -60, left: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(74,46,87,0.3)", filter: "blur(50px)" }} />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#D6336C,#B71F56)" }}>D</div>
            <span className="text-lg font-semibold text-white" style={{ fontFamily: "var(--font-headline)" }}>Dresso.io</span>
          </div>

          {/* Tagline */}
          <div className="relative z-10">
            <h1 className="text-3xl font-semibold text-white leading-tight mb-3" style={{ fontFamily: "var(--font-headline)" }}>
              Manage your marketplace with confidence
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "#7A6886" }}>
              Approve listings, manage payouts, resolve disputes — everything in one place.
            </p>
          </div>

          {/* Footer note */}
          <p className="relative z-10 text-xs" style={{ color: "#3D2E4A", fontFamily: "var(--font-mono)" }}>
            DRESSO.IO ADMIN · INTERNAL ONLY
          </p>
        </div>

        {/* Right login panel */}
        <div className="flex flex-1 items-center justify-center p-8" style={{ background: "#FFFCF6" }}>
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-headline)", color: "#1C1424" }}>
                Welcome back
              </h2>
              <p className="mt-1 text-sm" style={{ color: "#8B7A97" }}>Sign in to your admin account</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>
                  Email
                </label>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dresso.io"
                  className="admin-input"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>
                  Password
                </label>
                <input
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="admin-input"
                />
              </div>

              {loginError && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#FCE3ED", color: "#B71F56" }}>
                  {loginError}
                </div>
              )}

              <button type="submit" disabled={loggingIn} className="btn-primary w-full justify-center" style={{ padding: "12px 20px", borderRadius: "10px" }}>
                {loggingIn ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: "#FFFCF6" }}>
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "#FCE3ED" }}>
            <svg className="h-7 w-7" style={{ color: "#D6336C" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-headline)", color: "#1C1424" }}>Access denied</h1>
          <p className="mt-2 text-sm" style={{ color: "#8B7A97" }}>You don&apos;t have admin privileges.</p>
          {profile && <p className="mt-1 text-xs" style={{ color: "#B0A0B8" }}>{profile.email ?? profile.name}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
