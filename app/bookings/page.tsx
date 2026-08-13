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
  "REQUESTED","ACCEPTED","PAID","DISPATCHED","ACTIVE",
  "RETURNED","COMPLETED","CANCELLED","DISPUTED",
];

const PAGE_LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────

function formatPKR(value: number | string | undefined): string {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";
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
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${eYear}`;
}

function truncateId(id: string): string {
  return id.length > 8 ? id.slice(0, 8) + "…" : id;
}

function statusBadgeClass(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    REQUESTED: "badge badge-amber",
    ACCEPTED:  "badge badge-plum",
    PAID:      "badge badge-green",
    DISPATCHED:"badge badge-plum",
    ACTIVE:    "badge badge-green",
    RETURNED:  "badge badge-plum",
    COMPLETED: "badge badge-plum",
    CANCELLED: "badge badge-red",
    DISPUTED:  "badge badge-red",
  };
  return map[status] ?? "badge badge-neutral";
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
      const body: { outcome: "COMPLETED" | "CANCELLED"; damageDeduction?: number; note?: string } = { outcome };
      if (outcome === "COMPLETED" && damageDeduction) body.damageDeduction = parseFloat(damageDeduction);
      if (note.trim()) body.note = note.trim();
      await api.post(`/admin/bookings/${booking.id}/resolve`, body);
      setSuccess(true);
      setTimeout(() => { onResolved(); onClose(); }, 1200);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to resolve booking"
        : "Failed to resolve booking";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg admin-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #E8DDE4" }}>
          <div>
            <h3 className="font-semibold" style={{ fontFamily: "var(--font-headline)", fontSize: "18px", color: "#1C1424" }}>
              Resolve Dispute
            </h3>
            <p className="text-sm mt-0.5" style={{ color: "#8B7A97" }}>
              Booking #{truncateId(booking.id)} · {booking.listing?.title || "Unknown listing"}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg transition-colors" style={{ color: "#8B7A97" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#F5EDE8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {success ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: "#DEF2E9" }}>
              <svg className="w-6 h-6" style={{ color: "#0E8F6B" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold" style={{ color: "#1C1424" }}>Dispute Resolved</p>
            <p className="text-sm mt-1" style={{ color: "#8B7A97" }}>Booking marked as {outcome.toLowerCase()}.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-5">
              {/* Outcome */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>
                  Resolution Outcome
                </label>
                <div className="space-y-2">
                  {(["COMPLETED", "CANCELLED"] as const).map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                      style={{
                        borderColor: outcome === opt ? (opt === "COMPLETED" ? "#0E8F6B" : "#D6336C") : "#E8DDE4",
                        background: outcome === opt ? (opt === "COMPLETED" ? "rgba(14,143,107,0.06)" : "rgba(214,51,108,0.06)") : "transparent",
                      }}
                    >
                      <input
                        type="radio" name="outcome" value={opt}
                        checked={outcome === opt} onChange={() => setOutcome(opt)}
                        className="w-4 h-4"
                      />
                      <div>
                        <p className="text-sm font-medium" style={{ color: "#1C1424" }}>
                          {opt === "COMPLETED" ? "Complete — release payment to owner" : "Cancel — refund renter"}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "#8B7A97" }}>
                          {opt === "COMPLETED" ? "The rental was fulfilled." : "The rental failed. A refund will be issued."}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {outcome === "COMPLETED" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>
                    Damage Deduction (PKR)
                  </label>
                  <input
                    type="number" min="0" step="1"
                    value={damageDeduction} onChange={(e) => setDamageDeduction(e.target.value)}
                    placeholder="0"
                    className="admin-input"
                  />
                  <p className="text-xs mt-1" style={{ color: "#8B7A97" }}>Amount to deduct from the security deposit for damages, if any.</p>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>
                  Note (optional)
                </label>
                <textarea
                  value={note} onChange={(e) => setNote(e.target.value)}
                  rows={3} placeholder="Add a resolution note…"
                  className="admin-input" style={{ resize: "none", height: "auto" }}
                />
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm" style={{ background: "#FCE3ED", color: "#B71F56" }}>
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: "1px solid #E8DDE4" }}>
              <button type="button" onClick={onClose} disabled={submitting} className="btn-ghost" style={{ padding: "8px 18px" }}>
                Cancel
              </button>
              <button
                type="submit" disabled={submitting}
                className={outcome === "COMPLETED" ? "btn-success" : "btn-primary"}
                style={{ padding: "8px 18px" }}
              >
                {submitting ? "Resolving…" : outcome === "COMPLETED" ? "Complete Booking" : "Cancel Booking"}
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

  const [totalCount, setTotalCount] = useState(0);
  const [disputedCount, setDisputedCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = { page, limit: PAGE_LIMIT };
      if (activeStatus !== "ALL") params.status = activeStatus;
      const { data } = await api.get<BookingsResponse>("/admin/bookings", { params });
      setBookings(data.data);
      setTotal(data.total);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to load bookings"
        : "Failed to load bookings";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, activeStatus]);

  const fetchStats = useCallback(async () => {
    try {
      const [allRes, disputedRes, activeRes] = await Promise.all([
        api.get<BookingsResponse>("/admin/bookings", { params: { page: 1, limit: 1 } }),
        api.get<BookingsResponse>("/admin/bookings", { params: { status: "DISPUTED", page: 1, limit: 1 } }),
        api.get<BookingsResponse>("/admin/bookings", { params: { status: "ACTIVE", page: 1, limit: 1 } }),
      ]);
      setTotalCount(allRes.data.total);
      setDisputedCount(disputedRes.data.total);
      setActiveCount(activeRes.data.total);
    } catch { /* stats non-critical */ }
  }, []);

  useEffect(() => { fetchBookings(); }, [fetchBookings]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  function handleStatusChange(status: BookingStatus | "ALL") {
    setActiveStatus(status);
    setPage(1);
    setExpandedId(null);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function handleResolved() {
    fetchBookings();
    fetchStats();
  }

  const allTabOptions: Array<BookingStatus | "ALL"> = ["ALL", ...ALL_STATUSES];

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Bookings</h1>
        <p>View and manage all platform bookings and resolve disputes.</p>
      </div>

      {/* Stat cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="stat-card" style={{ borderTopColor: "#4A2E57" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-mono)", color: "#8B7A97" }}>Total Bookings</p>
          <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#1C1424" }}>{totalCount.toLocaleString()}</p>
        </div>
        <div className="stat-card" style={{ borderTopColor: disputedCount > 0 ? "#D6336C" : "#E8DDE4" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-mono)", color: disputedCount > 0 ? "#D6336C" : "#8B7A97" }}>Disputed</p>
          <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-mono)", color: disputedCount > 0 ? "#D6336C" : "#1C1424" }}>{disputedCount}</p>
        </div>
        <div className="stat-card" style={{ borderTopColor: "#0E8F6B" }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ fontFamily: "var(--font-mono)", color: "#8B7A97" }}>Active</p>
          <p className="text-3xl font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#0E8F6B" }}>{activeCount}</p>
        </div>
      </div>

      {/* Disputed alert */}
      {disputedCount > 0 && (
        <div className="mb-6 flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "#FCE3ED", border: "1px solid #E8658A" }}>
          <svg className="w-5 h-5 shrink-0" style={{ color: "#D6336C" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-sm font-semibold" style={{ color: "#B71F56" }}>
            {disputedCount} disputed booking{disputedCount !== 1 ? "s" : ""} require{disputedCount === 1 ? "s" : ""} your attention.
          </p>
          <button onClick={() => handleStatusChange("DISPUTED")} className="ml-auto btn-primary" style={{ padding: "5px 14px", fontSize: "12px" }}>
            View disputes
          </button>
        </div>
      )}

      {/* Status filter tabs */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        {allTabOptions.map((status) => {
          const isActive = activeStatus === status;
          const isDisputed = status === "DISPUTED";
          const hasDisputed = isDisputed && disputedCount > 0;
          return (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className="px-3 py-1.5 text-xs font-semibold rounded-full transition-all"
              style={
                isActive
                  ? { background: isDisputed ? "#D6336C" : "#1C1424", color: "#fff" }
                  : hasDisputed
                  ? { background: "#FCE3ED", color: "#B71F56", border: "1px solid #E8658A" }
                  : { background: "#fff", color: "#5B4F62", border: "1px solid #E8DDE4" }
              }
            >
              {status === "ALL" ? "All" : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-8 w-8 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: "#D6336C", borderRightColor: "#FCE3ED" }} />
          <p className="text-sm mt-4" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>Loading bookings…</p>
        </div>
      ) : error ? (
        <div className="admin-card p-8 text-center">
          <p className="text-sm mb-3" style={{ color: "#D6336C" }}>{error}</p>
          <button onClick={fetchBookings} className="btn-ghost">Retry</button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-4 h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#F5EDE8" }}>
            <svg className="h-8 w-8" style={{ color: "#C4A8B8" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="font-medium" style={{ color: "#1C1424" }}>No bookings found</p>
          <p className="mt-1 text-sm" style={{ color: "#8B7A97" }}>No bookings match this filter.</p>
        </div>
      ) : (
        <>
          <div className="admin-card">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Listing</th>
                  <th>Renter</th>
                  <th>Owner</th>
                  <th>Dates</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => {
                  const isExpanded = expandedId === booking.id;
                  const isDisputed = booking.status === "DISPUTED";
                  return (
                    <>
                      <tr
                        key={booking.id}
                        onClick={() => setExpandedId(isExpanded ? null : booking.id)}
                        style={{ cursor: "pointer", background: isDisputed ? "rgba(214,51,108,0.04)" : undefined }}
                      >
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "#8B7A97" }}>{truncateId(booking.id)}</td>
                        <td className="font-medium max-w-[140px] truncate" style={{ color: "#1C1424" }}>{booking.listing?.title || "Unknown"}</td>
                        <td style={{ color: "#5B4F62" }}>{booking.renter?.name || "—"}</td>
                        <td style={{ color: "#5B4F62" }}>{booking.owner?.name || "—"}</td>
                        <td style={{ color: "#5B4F62", fontSize: "13px" }}>
                          {booking.startDate && booking.endDate ? formatDateRange(booking.startDate, booking.endDate) : "—"}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{formatPKR(booking.rentalAmount)}</td>
                        <td><span className={statusBadgeClass(booking.status)}>{booking.status}</span></td>
                        <td>
                          {isDisputed ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); setResolvingBooking(booking); }}
                              className="btn-danger" style={{ padding: "5px 12px", fontSize: "12px" }}
                            >
                              Resolve
                            </button>
                          ) : (
                            <svg className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} style={{ color: "#C4A8B8" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${booking.id}-exp`}>
                          <td colSpan={8} style={{ background: "#FDFAF8", padding: "16px 16px 20px" }}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                              {[
                                { label: "Booking ID", value: booking.id, mono: true },
                                { label: "Listing ID", value: booking.listingId, mono: true },
                                { label: "Rental Amount", value: formatPKR(booking.rentalAmount), mono: false },
                                { label: "Security Deposit", value: formatPKR(booking.depositAmount), mono: false },
                                { label: "Cleaning Fee", value: formatPKR(booking.cleaningFee), mono: false },
                                { label: "Created", value: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", mono: false },
                              ].map(({ label, value, mono }) => (
                                <div key={label}>
                                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#8B7A97", fontFamily: "var(--font-mono)" }}>{label}</p>
                                  <p className="text-sm break-all" style={{ color: "#1C1424", fontFamily: mono ? "var(--font-mono)" : undefined, fontSize: mono ? "12px" : undefined }}>{value}</p>
                                </div>
                              ))}
                            </div>
                            {isDisputed && (
                              <div className="mt-4 pt-4" style={{ borderTop: "1px solid #E8DDE4" }}>
                                <button onClick={() => setResolvingBooking(booking)} className="btn-primary" style={{ padding: "8px 20px" }}>
                                  Resolve Dispute
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm" style={{ color: "#8B7A97" }}>
              Page <span className="font-medium" style={{ color: "#1C1424" }}>{page}</span> of{" "}
              <span className="font-medium" style={{ color: "#1C1424" }}>{totalPages}</span> · {total} result{total !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-ghost" style={{ padding: "7px 16px" }}>Previous</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-ghost" style={{ padding: "7px 16px" }}>Next</button>
            </div>
          </div>
        </>
      )}

      {resolvingBooking && (
        <ResolveModal booking={resolvingBooking} onClose={() => setResolvingBooking(null)} onResolved={handleResolved} />
      )}
    </div>
  );
}
