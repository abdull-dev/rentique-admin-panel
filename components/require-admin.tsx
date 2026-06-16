"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { type Profile, UserRole } from "@/lib/types";

type State = "loading" | "ok" | "forbidden";

/**
 * Gates pages whose backend routes are ADMIN-only (e.g. payouts). The global
 * AuthGuard already admits moderators, so without this a moderator would load
 * the page and then hit a wall of 403s on every API call. Here they get a clear
 * "Admins only" message instead.
 */
export default function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<State>("loading");

  useEffect(() => {
    let active = true;
    api
      .get("/auth/me")
      .then((res) => {
        const user: Profile = res.data.profile ?? res.data;
        if (active) {
          setState(user.roles.includes(UserRole.ADMIN) ? "ok" : "forbidden");
        }
      })
      .catch(() => {
        if (active) setState("forbidden");
      });
    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-600" />
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-semibold text-gray-900">Admins only</h1>
          <p className="mt-2 text-sm text-gray-500">
            Payout management is restricted to administrators. Contact an admin
            if you need access.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
