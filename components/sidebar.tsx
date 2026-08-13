"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/api";

const NAV = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
      { label: "Seller Fees", href: "/seller-fees", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
    ],
  },
  {
    group: "Marketplace",
    items: [
      { label: "Listings", href: "/listings", icon: "M4 6h16M4 10h16M4 14h16M4 18h16" },
      { label: "Bookings", href: "/bookings", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
      { label: "Users", href: "/users", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
      { label: "Taxonomy", href: "/taxonomy", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
    ],
  },
  {
    group: "Finance",
    items: [
      { label: "Payout Accounts", href: "/payout-accounts", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
      { label: "Payouts", href: "/payouts", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
      { label: "Refunds", href: "/refunds", icon: "M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await fetch("/api/proxy/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* ignore */ }
    window.location.href = `${API_URL}/auth/google`;
  };

  return (
    <aside
      style={{ background: "#0F0A14", borderRight: "1px solid #1E1428" }}
      className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col"
    >
      {/* Logo */}
      <div className="flex h-[60px] items-center gap-3 px-5" style={{ borderBottom: "1px solid #1E1428" }}>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #D6336C 0%, #B71F56 100%)" }}
        >
          D
        </div>
        <div>
          <p className="text-sm font-semibold text-white" style={{ fontFamily: "var(--font-headline)", letterSpacing: "-0.01em" }}>
            Dresso.io
          </p>
          <p className="text-[10px] font-medium" style={{ color: "#5B4F70", letterSpacing: "0.08em" }}>
            ADMIN
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {NAV.map((group) => (
          <div key={group.group}>
            <p
              className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "#3D2E4A", fontFamily: "var(--font-mono)" }}
            >
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all"
                    style={{
                      color: isActive ? "#FFFFFF" : "#7A6886",
                      background: isActive ? "rgba(214,51,108,0.14)" : "transparent",
                      borderLeft: isActive ? "2px solid #D6336C" : "2px solid transparent",
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.04)"; }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-4" style={{ borderTop: "1px solid #1E1428", paddingTop: "16px" }}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          style={{ color: "#7A6886" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#FFFFFF"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7A6886"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
      </div>
    </aside>
  );
}
