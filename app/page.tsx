"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import type { Booking, Listing, PaginatedResponse } from "@/lib/types";

// ─── Stat card types ──────────────────────────────────────────────────────────

interface StatCard {
  label: string;
  value: number | null;
  icon: React.ReactNode;
  topColor: string;
  iconBg: string;
  iconColor: string;
  href: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const icons = {
  listings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  ),
  pending: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  ),
  bookings: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  ),
  disputed: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  ),
};

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([
    {
      label: "Total Listings",
      value: null,
      icon: icons.listings,
      topColor: "#D6336C",
      iconBg: "#FCE3ED",
      iconColor: "#D6336C",
      href: "/listings",
    },
    {
      label: "Pending Review",
      value: null,
      icon: icons.pending,
      topColor: "#DE8E0F",
      iconBg: "#FFF0D4",
      iconColor: "#DE8E0F",
      href: "/listings",
    },
    {
      label: "Total Bookings",
      value: null,
      icon: icons.bookings,
      topColor: "#4A2E57",
      iconBg: "#EAE1EE",
      iconColor: "#4A2E57",
      href: "/bookings",
    },
    {
      label: "Disputed",
      value: null,
      icon: icons.disputed,
      topColor: "#B71F56",
      iconBg: "#FCE3ED",
      iconColor: "#B71F56",
      href: "/bookings",
    },
  ]);

  const [pendingListings, setPendingListings] = useState<Listing[] | null>(null);
  const [disputedBookings, setDisputedBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    Promise.allSettled([
      api.get<PaginatedResponse<Listing>>("/listings", { params: { limit: 1 } }),
      api.get<Listing[]>("/admin/listings/pending"),
      api.get<PaginatedResponse<Booking>>("/admin/bookings", { params: { limit: 1 } }),
      api.get<PaginatedResponse<Booking>>("/admin/bookings", { params: { status: "DISPUTED", limit: 1 } }),
    ]).then(([listingsRes, pendingRes, bookingsRes, disputedRes]) => {
      const totalListings = listingsRes.status === "fulfilled" ? listingsRes.value.data.total : 0;
      const pendingCount = pendingRes.status === "fulfilled" ? pendingRes.value.data.length : 0;
      const totalBookings = bookingsRes.status === "fulfilled" ? bookingsRes.value.data.total : 0;
      const disputedCount = disputedRes.status === "fulfilled" ? disputedRes.value.data.total : 0;

      setStats((prev) =>
        prev.map((card, i) => ({
          ...card,
          value: [totalListings, pendingCount, totalBookings, disputedCount][i],
        })),
      );

      if (pendingRes.status === "fulfilled") {
        setPendingListings(pendingRes.value.data.slice(0, 5));
      } else {
        setPendingListings([]);
      }

      if (disputedRes.status === "fulfilled") {
        api
          .get<PaginatedResponse<Booking>>("/admin/bookings", { params: { status: "DISPUTED", limit: 5 } })
          .then((res) => setDisputedBookings(res.data.data))
          .catch(() => setDisputedBookings([]));
      } else {
        setDisputedBookings([]);
      }
    });
  }, []);

  return (
    <div>
      {/* Page header */}
      <div className="page-header flex items-start justify-between">
        <div>
          <h1>Dashboard</h1>
          <p>Overview of your rental marketplace</p>
        </div>
        <Link href="/listings" className="btn-primary text-sm">
          Review listings
        </Link>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) =>
          card.value === null ? (
            <div key={card.label} className="stat-card" style={{ borderTopColor: card.topColor }}>
              <div className="skeleton mb-3 h-8 w-20" />
              <div className="skeleton h-4 w-28" />
            </div>
          ) : (
            <Link
              key={card.label}
              href={card.href}
              className="stat-card block transition-shadow hover:shadow-md"
              style={{ borderTopColor: card.topColor }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: card.iconBg, color: card.iconColor }}
                >
                  {card.icon}
                </div>
              </div>
              <p
                className="text-3xl font-semibold leading-none"
                style={{ fontFamily: "var(--font-mono)", color: "#1C1424" }}
              >
                {card.value.toLocaleString()}
              </p>
              <p className="mt-1.5 text-sm" style={{ color: "#8B7A97" }}>{card.label}</p>
            </Link>
          ),
        )}
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pending listings */}
        <div className="admin-card">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E8DDE4" }}>
            <div>
              <p className="font-semibold" style={{ color: "#1C1424" }}>Pending Review</p>
              <p className="text-xs mt-0.5" style={{ color: "#8B7A97" }}>Listings awaiting approval</p>
            </div>
            <Link href="/listings" className="text-sm font-semibold" style={{ color: "#D6336C" }}>
              View all →
            </Link>
          </div>
          {pendingListings === null ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}
            </div>
          ) : pendingListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 h-12 w-12 rounded-full flex items-center justify-center" style={{ background: "#DEF2E9" }}>
                <svg className="h-6 w-6" style={{ color: "#0E8F6B" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#1C1424" }}>All caught up</p>
              <p className="text-xs mt-1" style={{ color: "#8B7A97" }}>No pending listings</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pendingListings.map((listing) => (
                  <tr key={listing.id}>
                    <td className="font-medium" style={{ color: "#1C1424" }}>{listing.title}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      Rs {Number(listing.rentalPrice).toLocaleString()}
                    </td>
                    <td style={{ color: "#8B7A97", fontSize: "13px" }}>
                      {new Date(listing.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Disputed bookings */}
        <div className="admin-card">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid #E8DDE4" }}>
            <div>
              <p className="font-semibold" style={{ color: "#1C1424" }}>Disputed Bookings</p>
              <p className="text-xs mt-0.5" style={{ color: "#8B7A97" }}>Disputes requiring resolution</p>
            </div>
            <Link href="/bookings" className="text-sm font-semibold" style={{ color: "#D6336C" }}>
              View all →
            </Link>
          </div>
          {disputedBookings === null ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="skeleton h-10 w-full" />)}
            </div>
          ) : disputedBookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="mb-3 h-12 w-12 rounded-full flex items-center justify-center" style={{ background: "#DEF2E9" }}>
                <svg className="h-6 w-6" style={{ color: "#0E8F6B" }} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: "#1C1424" }}>No disputes</p>
              <p className="text-xs mt-1" style={{ color: "#8B7A97" }}>All bookings are healthy</p>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {disputedBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="font-medium" style={{ color: "#1C1424" }}>
                      {booking.listing?.title ?? booking.listingId.slice(0, 8)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      Rs {Number(booking.rentalAmount).toLocaleString()}
                    </td>
                    <td style={{ color: "#8B7A97", fontSize: "13px" }}>
                      {new Date(booking.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
