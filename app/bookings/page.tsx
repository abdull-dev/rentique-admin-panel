"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  listingId: string;
  startDate: string;
  endDate: string;
  status:
    | "REQUESTED"
    | "ACCEPTED"
    | "PAID"
    | "DISPATCHED"
    | "ACTIVE"
    | "RETURNED"
    | "COMPLETED"
    | "CANCELLED"
    | "DISPUTED";
  rentalAmount?: number | string;
  depositAmount?: number | string;
  cleaningFee?: number | string;
  listing?: { id: string; title: string; ownerId?: string };
  renter?: { id: string; name?: string };
  owner?: { id: string; name?: string };
  createdAt?: string;
}

type BookingStatus = Booking["status"];

interface BookingsResponse {
  data: Booking[];
  page: number;
  limit: number;
  total: number;
}

// ─── Constants ────────────────────────────────────────────────────────

const ALL_STATUSES: BookingStatus[] = [
  "REQUESTED",
  "ACCEPTED",
  "PAID",
  "DISPATCHED",
  "ACTIVE",
  "RETURNED",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const STATUS_COLORS: Record<BookingStatus, string> = {
  REQUESTED: "bg-blue-50 text-blue-700 border border-blue-200",
  ACCEPTED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  PAID: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  DISPATCHED: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  ACTIVE: "bg-green-50 text-green-700 border border-green-200",
  RETURNED: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  COMPLETED: "bg-gray-50 text-gray-600 border border-gray-200",
  CANCELLED: "bg-red-50 text-red-600 border border-red-200",
  DISPUTED: "bg-red-100 text-red-800 border-2 border-red-400 font-bold",
};

const PAGE_LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────

function formatPKR(value: number | string | undefined): string {
  if (value == null) return "---";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "---";
  return `PKR ${num.toLocaleString("en-PK")}`;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const sMonth = s.toLocaleDateString("en-US", { month: "short" });
  const sDay = s.getDate();
  const eMonth = e.toLocaleDateString("en-US", { month: "short" });
  const eDay = e.getDate();
  const eYear = e.getFullYear();

  return `${sMonth} ${sDay} - ${eMonth} ${eDay}, ${eYear}`;
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + "..." : id;
}

// ─── Resolve Modal ────────────────────────────────────────────────────

function ResolveModal({
  booking,
  onClose,
  onResolved,
}: {
  booking: Booking;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [outcome, setOutcome] = useState<"COMPLETED" | "CANCELLED">("COMPLETED");
  const [damageDeduction, setDamageDeduction] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body: {
        outcome: "COMPLETED" | "CANCELLED";
        damageDeduction?: number;
        note?: string;
      } = { outcome };

      if (outcome === "COMPLETED" && damageDeduction) {
        body.damageDeduction = parseFloat(damageDeduction);
      }
      if (note.trim()) {
        body.note = note.trim();
      }

      await api.post(`/admin/bookings/${booking.id}/resolve`, body);
      setSuccess(true);
      setTimeout(() => {
        onResolved();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message || "Failed to resolve booking"
          : "Failed to resolve booking";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Resolve Dispute
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Booking #{truncateId(booking.id)} &middot;{" "}
              {booking.listing?.title || "Unknown listing"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Success state */}
        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-900">Dispute Resolved</p>
            <p className="text-sm text-gray-500 mt-1">
              Booking marked as {outcome.toLowerCase()}.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-5">
              {/* Outcome selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Resolution Outcome
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-green-400 has-[:checked]:bg-green-50">
                    <input
                      type="radio"
                      name="outcome"
                      value="COMPLETED"
                      checked={outcome === "COMPLETED"}
                      onChange={() => setOutcome("COMPLETED")}
                      className="w-4 h-4 text-green-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Complete (release payment to owner)
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        The rental was fulfilled. Payment will be released to the
                        owner.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors has-[:checked]:border-red-400 has-[:checked]:bg-red-50">
                    <input
                      type="radio"
                      name="outcome"
                      value="CANCELLED"
                      checked={outcome === "CANCELLED"}
                      onChange={() => setOutcome("CANCELLED")}
                      className="w-4 h-4 text-red-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Cancel (refund renter)
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        The rental failed. A refund will be issued to the renter.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Damage deduction - only for Complete outcome */}
              {outcome === "COMPLETED" && (
                <div>
                  <label
                    htmlFor="damageDeduction"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Damage Deduction (PKR)
                  </label>
                  <input
                    id="damageDeduction"
                    type="number"
                    min="0"
                    step="1"
                    value={damageDeduction}
                    onChange={(e) => setDamageDeduction(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Amount to deduct from the security deposit for damages, if any.
                  </p>
                </div>
              )}

              {/* Note */}
              <div>
                <label
                  htmlFor="resolveNote"
                  className="block text-sm font-medium text-gray-700 mb-1.5"
                >
                  Note
                </label>
                <textarea
                  id="resolveNote"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="Add a resolution note..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  outcome === "COMPLETED"
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {submitting
                  ? "Resolving..."
                  : outcome === "COMPLETED"
                    ? "Complete Booking"
                    : "Cancel Booking"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<BookingStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolvingBooking, setResolvingBooking] = useState<Booking | null>(null);

  // Stats
  const [totalCount, setTotalCount] = useState(0);
  const [disputedCount, setDisputedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  // ─── Fetch bookings ─────────────────────────────────────────────────

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string | number> = {
        page,
        limit: PAGE_LIMIT,
      };
      if (activeStatus !== "ALL") {
        params.status = activeStatus;
      }

      const { data } = await api.get<BookingsResponse>("/admin/bookings", {
        params,
      });

      setBookings(data.data);
      setTotal(data.total);
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data
              ?.message || "Failed to load bookings"
          : "Failed to load bookings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, activeStatus]);

  // Fetch stats (total, disputed, active counts)
  const fetchStats = useCallback(async () => {
    try {
      const [allRes, disputedRes, activeRes] = await Promise.all([
        api.get<BookingsResponse>("/admin/bookings", {
          params: { page: 1, limit: 1 },
        }),
        api.get<BookingsResponse>("/admin/bookings", {
          params: { status: "DISPUTED", page: 1, limit: 1 },
        }),
        api.get<BookingsResponse>("/admin/bookings", {
          params: { status: "ACTIVE", page: 1, limit: 1 },
        }),
      ]);

      setTotalCount(allRes.data.total);
      setDisputedCount(disputedRes.data.total);
      setActiveCount(activeRes.data.total);
    } catch {
      // Stats are non-critical; fail silently
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page when status filter changes
  function handleStatusChange(status: BookingStatus | "ALL") {
    setActiveStatus(status);
    setPage(1);
    setExpandedId(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function handleRowClick(id: string) {
    setExpandedId(expandedId === id ? null : id);
  }

  function handleResolved() {
    fetchBookings();
    fetchStats();
  }

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Bookings Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage all platform bookings and resolve disputes.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Total Bookings
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {totalCount.toLocaleString()}
            </p>
          </div>
          <div
            className={`rounded-lg border px-5 py-4 ${
              disputedCount > 0
                ? "bg-red-50 border-red-200"
                : "bg-white border-gray-200"
            }`}
          >
            <p
              className={`text-xs font-medium uppercase tracking-wide ${
                disputedCount > 0 ? "text-red-600" : "text-gray-500"
              }`}
            >
              Disputed
            </p>
            <p
              className={`text-2xl font-bold mt-1 ${
                disputedCount > 0 ? "text-red-700" : "text-gray-900"
              }`}
            >
              {disputedCount}
            </p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Active
            </p>
            <p className="text-2xl font-bold text-green-700 mt-1">{activeCount}</p>
          </div>
        </div>

        {/* Disputed alert banner */}
        {disputedCount > 0 && (
          <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-red-50 border border-red-300 rounded-lg">
            <svg
              className="w-5 h-5 text-red-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <p className="text-sm font-medium text-red-800">
              {disputedCount} disputed booking
              {disputedCount !== 1 ? "s" : ""} require
              {disputedCount === 1 ? "s" : ""} your attention.
            </p>
            <button
              onClick={() => handleStatusChange("DISPUTED")}
              className="ml-auto px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-100 transition-colors"
            >
              View Disputes
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          <button
            onClick={() => handleStatusChange("ALL")}
            className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
              activeStatus === "ALL"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
            }`}
          >
            All
          </button>
          {ALL_STATUSES.map((status) => {
            const isDisputed = status === "DISPUTED";
            const isActive = activeStatus === status;

            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-colors ${
                  isActive
                    ? isDisputed
                      ? "bg-red-600 text-white"
                      : "bg-gray-900 text-white"
                    : isDisputed && disputedCount > 0
                      ? "bg-red-50 text-red-700 border border-red-300 hover:bg-red-100"
                      : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-100"
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-[3px] border-gray-200 border-t-gray-800 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-4">Loading bookings...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-red-200 p-8 text-center">
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button
              onClick={fetchBookings}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-500">No bookings found.</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="w-full bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Table header */}
              <div className="hidden lg:grid grid-cols-[100px_1fr_120px_120px_180px_120px_110px_90px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  ID
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Listing
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Renter
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Owner
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Dates
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Amount
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Status
                </span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Actions
                </span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100">
                {bookings.map((booking) => {
                  const isExpanded = expandedId === booking.id;
                  const isDisputed = booking.status === "DISPUTED";

                  return (
                    <div
                      key={booking.id}
                      className={isDisputed ? "bg-red-50/50" : ""}
                    >
                      {/* Row */}
                      <button
                        onClick={() => handleRowClick(booking.id)}
                        className="w-full text-left grid grid-cols-1 lg:grid-cols-[100px_1fr_120px_120px_180px_120px_110px_90px] gap-2 lg:gap-4 items-center px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      >
                        {/* ID */}
                        <span className="text-xs font-mono text-gray-500">
                          <span className="lg:hidden text-gray-400 mr-1">
                            ID:
                          </span>
                          {truncateId(booking.id)}
                        </span>

                        {/* Listing */}
                        <span className="text-sm text-gray-900 font-medium truncate">
                          {booking.listing?.title || "Unknown"}
                        </span>

                        {/* Renter */}
                        <span className="text-sm text-gray-600 truncate">
                          <span className="lg:hidden text-gray-400 mr-1">
                            Renter:
                          </span>
                          {booking.renter?.name || "---"}
                        </span>

                        {/* Owner */}
                        <span className="text-sm text-gray-600 truncate">
                          <span className="lg:hidden text-gray-400 mr-1">
                            Owner:
                          </span>
                          {booking.owner?.name || "---"}
                        </span>

                        {/* Dates */}
                        <span className="text-sm text-gray-600">
                          <span className="lg:hidden text-gray-400 mr-1">
                            Dates:
                          </span>
                          {booking.startDate && booking.endDate
                            ? formatDateRange(booking.startDate, booking.endDate)
                            : "---"}
                        </span>

                        {/* Amount */}
                        <span className="text-sm font-medium text-gray-900">
                          <span className="lg:hidden text-gray-400 mr-1 font-normal">
                            Amount:
                          </span>
                          {formatPKR(booking.rentalAmount)}
                        </span>

                        {/* Status */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${STATUS_COLORS[booking.status]}`}
                        >
                          {booking.status}
                        </span>

                        {/* Actions */}
                        <span className="flex items-center">
                          {isDisputed ? (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setResolvingBooking(booking);
                              }}
                              className="text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-2.5 py-1 rounded-md hover:bg-red-200 transition-colors cursor-pointer"
                            >
                              Resolve
                            </span>
                          ) : (
                            <svg
                              className={`w-4 h-4 text-gray-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          )}
                        </span>
                      </button>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-5 pb-4 pt-1 border-t border-gray-100 bg-gray-50/50">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3">
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Booking ID
                              </p>
                              <p className="text-sm text-gray-900 font-mono break-all">
                                {booking.id}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Listing ID
                              </p>
                              <p className="text-sm text-gray-900 font-mono break-all">
                                {booking.listingId}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Rental Amount
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {formatPKR(booking.rentalAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Security Deposit
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {formatPKR(booking.depositAmount)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Cleaning Fee
                              </p>
                              <p className="text-sm text-gray-900 font-medium">
                                {formatPKR(booking.cleaningFee)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Created
                              </p>
                              <p className="text-sm text-gray-900">
                                {booking.createdAt
                                  ? new Date(
                                      booking.createdAt
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "---"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Renter
                              </p>
                              <p className="text-sm text-gray-900">
                                {booking.renter?.name || "---"}
                                {booking.renter?.id && (
                                  <span className="text-xs text-gray-400 ml-1 font-mono">
                                    ({truncateId(booking.renter.id)})
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Owner
                              </p>
                              <p className="text-sm text-gray-900">
                                {booking.owner?.name || "---"}
                                {booking.owner?.id && (
                                  <span className="text-xs text-gray-400 ml-1 font-mono">
                                    ({truncateId(booking.owner.id)})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Resolve button in expanded view for disputed */}
                          {isDisputed && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <button
                                onClick={() => setResolvingBooking(booking)}
                                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                              >
                                Resolve Dispute
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} &middot; {total} result
                {total !== 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Resolve Modal */}
      {resolvingBooking && (
        <ResolveModal
          booking={resolvingBooking}
          onClose={() => setResolvingBooking(null)}
          onResolved={handleResolved}
        />
      )}
    </div>
  );
}
