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
  color: string;
  href: string;
}

// ─── Skeleton helpers ─────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="skeleton h-12 w-12 rounded-lg" />
        <div className="flex-1">
          <div className="skeleton mb-2 h-8 w-16" />
          <div className="skeleton h-4 w-24" />
        </div>
      </div>
    </div>
  );
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-10 w-full" />
      ))}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const icons = {
  listings: (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
  ),
  pending: (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  ),
  bookings: (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
      />
    </svg>
  ),
  disputed: (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
      />
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
      color: "bg-blue-50 text-blue-600",
      href: "/listings",
    },
    {
      label: "Pending Review",
      value: null,
      icon: icons.pending,
      color: "bg-amber-50 text-amber-600",
      href: "/listings",
    },
    {
      label: "Total Bookings",
      value: null,
      icon: icons.bookings,
      color: "bg-green-50 text-green-600",
      href: "/bookings",
    },
    {
      label: "Disputed Bookings",
      value: null,
      icon: icons.disputed,
      color: "bg-red-50 text-red-600",
      href: "/bookings",
    },
  ]);

  const [pendingListings, setPendingListings] = useState<Listing[] | null>(
    null,
  );
  const [disputedBookings, setDisputedBookings] = useState<Booking[] | null>(
    null,
  );

  useEffect(() => {
    // Fetch all stats in parallel.
    Promise.allSettled([
      api.get<PaginatedResponse<Listing>>("/listings", {
        params: { limit: 1 },
      }),
      api.get<Listing[]>("/admin/listings/pending"),
      api.get<PaginatedResponse<Booking>>("/admin/bookings", {
        params: { limit: 1 },
      }),
      api.get<PaginatedResponse<Booking>>("/admin/bookings", {
        params: { status: "DISPUTED", limit: 1 },
      }),
    ]).then(([listingsRes, pendingRes, bookingsRes, disputedRes]) => {
      const totalListings =
        listingsRes.status === "fulfilled" ? listingsRes.value.data.total : 0;
      const pendingCount =
        pendingRes.status === "fulfilled"
          ? pendingRes.value.data.length
          : 0;
      const totalBookings =
        bookingsRes.status === "fulfilled" ? bookingsRes.value.data.total : 0;
      const disputedCount =
        disputedRes.status === "fulfilled" ? disputedRes.value.data.total : 0;

      setStats((prev) =>
        prev.map((card, i) => ({
          ...card,
          value: [totalListings, pendingCount, totalBookings, disputedCount][i],
        })),
      );

      // Store pending listings for the table (first 5).
      if (pendingRes.status === "fulfilled") {
        setPendingListings(pendingRes.value.data.slice(0, 5));
      } else {
        setPendingListings([]);
      }

      // Fetch disputed bookings for the table.
      if (disputedRes.status === "fulfilled") {
        // We already have total; fetch the actual items separately.
        api
          .get<PaginatedResponse<Booking>>("/admin/bookings", {
            params: { status: "DISPUTED", limit: 5 },
          })
          .then((res) => setDisputedBookings(res.data.data))
          .catch(() => setDisputedBookings([]));
      } else {
        setDisputedBookings([]);
      }
    });
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your rental marketplace
        </p>
      </div>

      {/* Stats grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((card) =>
          card.value === null ? (
            <StatSkeleton key={card.label} />
          ) : (
            <Link
              key={card.label}
              href={card.href}
              className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}
                >
                  {card.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {card.value.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
              </div>
            </Link>
          ),
        )}
      </div>

      {/* Tables grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Pending listings */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Pending Listings
            </h2>
            <Link
              href="/listings"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </Link>
          </div>
          <div className="p-6">
            {pendingListings === null ? (
              <TableSkeleton />
            ) : pendingListings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No pending listings
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Title</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingListings.map((listing, i) => (
                    <tr
                      key={listing.id}
                      className={`${i % 2 === 1 ? "bg-gray-50" : ""} border-b border-gray-50`}
                    >
                      <td className="py-3 font-medium text-gray-900">
                        {listing.title}
                      </td>
                      <td className="py-3 text-gray-600">
                        Rs {Number(listing.rentalPrice).toLocaleString()}
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(listing.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Disputed bookings */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Disputed Bookings
            </h2>
            <Link
              href="/bookings"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
            >
              View all
            </Link>
          </div>
          <div className="p-6">
            {disputedBookings === null ? (
              <TableSkeleton />
            ) : disputedBookings.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">
                No disputed bookings
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-3 font-medium">Listing</th>
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {disputedBookings.map((booking, i) => (
                    <tr
                      key={booking.id}
                      className={`${i % 2 === 1 ? "bg-gray-50" : ""} border-b border-gray-50`}
                    >
                      <td className="py-3 font-medium text-gray-900">
                        {booking.listing?.title ?? booking.listingId.slice(0, 8)}
                      </td>
                      <td className="py-3 text-gray-600">
                        Rs {Number(booking.rentalAmount).toLocaleString()}
                      </td>
                      <td className="py-3 text-gray-400">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/listings"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              {icons.listings}
            </div>
            <h3 className="font-semibold text-gray-900">Manage Listings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Review, approve, or reject listings
            </p>
          </Link>

          <Link
            href="/bookings"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-600">
              {icons.bookings}
            </div>
            <h3 className="font-semibold text-gray-900">Manage Bookings</h3>
            <p className="mt-1 text-sm text-gray-500">
              View all bookings and resolve disputes
            </p>
          </Link>

          <Link
            href="/users"
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
                />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900">Manage Users</h3>
            <p className="mt-1 text-sm text-gray-500">
              View user profiles and manage roles
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
