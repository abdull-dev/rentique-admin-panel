"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import api from "@/lib/api";
import Spinner from "@/components/spinner";
import { ToastContainer, useToasts } from "@/components/toast";
import { formatPKR } from "@/lib/format";
import { errorMessage } from "@/lib/errors";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Media {
  id: string;
  url: string;
  isCover?: boolean;
}

interface Owner {
  id: string;
  name?: string;
  avatarUrl?: string;
  ownerType?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Listing {
  id: string;
  title: string;
  description?: string;
  rentalPrice: number | string;
  originalRetailValue?: number | string;
  status:
    | "DRAFT"
    | "PENDING_REVIEW"
    | "LIVE"
    | "PAUSED"
    | "RENTED_OUT"
    | "REJECTED";
  gender?: string;
  condition?: string;
  media?: Media[];
  owner?: Owner;
  category?: Category;
  createdAt?: string;
}

interface PaginatedResponse {
  data: Listing[];
  page: number;
  limit: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getCoverImage(media?: Media[]): string | null {
  if (!media || media.length === 0) return null;
  const cover = media.find((m) => m.isCover);
  return cover?.url ?? media[0].url ?? null;
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    LIVE: "badge badge-green",
    PAUSED: "badge badge-neutral",
    DRAFT: "badge badge-neutral",
    PENDING_REVIEW: "badge badge-amber",
    RENTED_OUT: "badge badge-plum",
    REJECTED: "badge badge-red",
  };
  return map[status] ?? "badge badge-neutral";
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Tab = "pending" | "all";

export default function ListingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());

  const { toasts, addToast, dismissToast } = useToasts();

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await api.get<Listing[]>("/admin/listings/pending");
      setPendingListings(res.data);
    } catch {
      setPendingError("Failed to load pending listings.");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setAllLoading(true);
    setAllError(null);
    try {
      const res = await api.get<PaginatedResponse>("/listings", {
        params: { page, limit, sort: "newest" },
      });
      setAllListings(res.data.data);
      setTotal(res.data.total);
    } catch {
      setAllError("Failed to load listings.");
    } finally {
      setAllLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { if (activeTab === "all") fetchAll(); }, [activeTab, fetchAll]);

  const handleApprove = async (id: string, title: string) => {
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      await api.post(`/admin/listings/${id}/approve`);
      setPendingListings((prev) => prev.filter((l) => l.id !== id));
      addToast(`"${title}" approved successfully.`, "success");
    } catch (err) {
      addToast(errorMessage(err, `Failed to approve "${title}".`), "error");
    } finally {
      setApprovingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleReject = async (id: string, title: string) => {
    setRejectingIds((prev) => new Set(prev).add(id));
    try {
      await api.post(`/admin/listings/${id}/reject`);
      setPendingListings((prev) => prev.filter((l) => l.id !== id));
      addToast(`"${title}" rejected.`, "success");
    } catch (err) {
      addToast(errorMessage(err, `Failed to reject "${title}".`), "error");
    } finally {
      setRejectingIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const TABS: Tab[] = ["pending", "all"];
  const tabLabels: Record<Tab, string> = { pending: "Pending Review", all: "All Listings" };

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <h1>Listings</h1>
        <p>Review and manage all listings on the platform.</p>
      </div>

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg p-1" style={{ background: "#F5EDE8", width: "fit-content" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="rounded-md px-5 py-1.5 text-sm font-medium transition-all"
            style={
              activeTab === tab
                ? { background: "#fff", color: "#1C1424", boxShadow: "0 1px 3px rgba(28,20,36,0.1)" }
                : { color: "#8B7A97" }
            }
          >
            {tabLabels[tab]}
            {tab === "pending" && pendingListings.length > 0 && (
              <span className="ml-2 badge badge-pink" style={{ fontSize: "10px", padding: "1px 6px" }}>
                {pendingListings.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "pending" ? (
        <PendingTab
          listings={pendingListings}
          loading={pendingLoading}
          error={pendingError}
          approvingIds={approvingIds}
          rejectingIds={rejectingIds}
          onApprove={handleApprove}
          onReject={handleReject}
          onRetry={fetchPending}
        />
      ) : (
        <AllListingsTab
          listings={allListings}
          loading={allLoading}
          error={allError}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          onRetry={fetchAll}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Review Tab
// ---------------------------------------------------------------------------

function PendingTab({
  listings,
  loading,
  error,
  approvingIds,
  rejectingIds,
  onApprove,
  onReject,
  onRetry,
}: {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  approvingIds: Set<string>;
  rejectingIds: Set<string>;
  onApprove: (id: string, title: string) => void;
  onReject: (id: string, title: string) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: "#D6336C", borderRightColor: "#FCE3ED" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm mb-3" style={{ color: "#D6336C" }}>{error}</p>
        <button onClick={onRetry} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#F5EDE8" }}>
          <svg className="h-8 w-8" style={{ color: "#C4A8B8" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <p className="font-medium" style={{ color: "#1C1424" }}>No pending listings</p>
        <p className="mt-1 text-sm" style={{ color: "#8B7A97" }}>All listings have been reviewed. Check back later.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {listings.map((listing) => (
        <PendingCard
          key={listing.id}
          listing={listing}
          approving={approvingIds.has(listing.id)}
          rejecting={rejectingIds.has(listing.id)}
          onApprove={() => onApprove(listing.id, listing.title)}
          onReject={() => onReject(listing.id, listing.title)}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Card
// ---------------------------------------------------------------------------

function PendingCard({
  listing,
  approving,
  rejecting,
  onApprove,
  onReject,
}: {
  listing: Listing;
  approving: boolean;
  rejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const imageUrl = getCoverImage(listing.media);

  return (
    <div className="admin-card">
      {/* Image */}
      <div className="relative h-48 w-full" style={{ background: "#F5EDE8" }}>
        {imageUrl ? (
          <Image src={imageUrl} alt={listing.title} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-12 w-12" style={{ color: "#E8DDE4" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold line-clamp-1" style={{ color: "#1C1424" }}>{listing.title}</h3>
          <span className="shrink-0 font-semibold" style={{ fontFamily: "var(--font-mono)", color: "#D6336C", fontSize: "14px" }}>
            {formatPKR(listing.rentalPrice)}
          </span>
        </div>

        {listing.category && (
          <p className="mt-1 text-xs" style={{ color: "#8B7A97" }}>{listing.category.name}</p>
        )}

        {listing.owner && (
          <div className="mt-3 flex items-center gap-2">
            {listing.owner.avatarUrl ? (
              <Image src={listing.owner.avatarUrl} alt={listing.owner.name || "Owner"} width={22} height={22} className="rounded-full" />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold" style={{ background: "#EAE1EE", color: "#4A2E57" }}>
                {(listing.owner.name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm" style={{ color: "#5B4F62" }}>{listing.owner.name ?? "Unknown"}</span>
            {listing.owner.ownerType && (
              <span className="badge badge-plum">{listing.owner.ownerType}</span>
            )}
          </div>
        )}

        <p className="mt-2 text-xs" style={{ color: "#B0A0B8" }}>Submitted {formatDate(listing.createdAt)}</p>

        {listing.description && (
          <p className="mt-2 text-sm line-clamp-2" style={{ color: "#5B4F62" }}>{listing.description}</p>
        )}

        <div className="mt-4 flex gap-3">
          <button
            onClick={onApprove}
            disabled={approving || rejecting}
            className="btn-success flex-1"
          >
            {approving ? <><Spinner /> Approving…</> : "Approve"}
          </button>
          <button
            onClick={onReject}
            disabled={approving || rejecting}
            className="btn-danger flex-1"
          >
            {rejecting ? <><Spinner /> Rejecting…</> : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// All Listings Tab
// ---------------------------------------------------------------------------

function AllListingsTab({
  listings,
  loading,
  error,
  page,
  totalPages,
  total,
  onPageChange,
  onRetry,
}: {
  listings: Listing[];
  loading: boolean;
  error: string | null;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-4 border-transparent animate-spin" style={{ borderTopColor: "#D6336C", borderRightColor: "#FCE3ED" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm mb-3" style={{ color: "#D6336C" }}>{error}</p>
        <button onClick={onRetry} className="btn-primary">Retry</button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="mb-4 h-16 w-16 rounded-full flex items-center justify-center" style={{ background: "#F5EDE8" }}>
          <svg className="h-8 w-8" style={{ color: "#C4A8B8" }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
          </svg>
        </div>
        <p className="font-medium" style={{ color: "#1C1424" }}>No listings yet</p>
        <p className="mt-1 text-sm" style={{ color: "#8B7A97" }}>Listings will appear here once submitted.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-card">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const imageUrl = getCoverImage(listing.media);
                return (
                  <tr key={listing.id}>
                    <td>
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg" style={{ background: "#F5EDE8" }}>
                        {imageUrl ? (
                          <Image src={imageUrl} alt={listing.title} fill className="object-cover" sizes="40px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg className="h-5 w-5" style={{ color: "#E8DDE4" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate font-medium" style={{ color: "#1C1424" }}>{listing.title}</td>
                    <td style={{ color: "#5B4F62" }}>{listing.category?.name ?? "—"}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>{formatPKR(listing.rentalPrice)}</td>
                    <td><span className={statusBadgeClass(listing.status)}>{statusLabel(listing.status)}</span></td>
                    <td style={{ color: "#5B4F62" }}>{listing.owner?.name ?? "—"}</td>
                    <td style={{ color: "#8B7A97", fontSize: "13px" }}>{formatDate(listing.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm" style={{ color: "#8B7A97" }}>
          Showing{" "}
          <span className="font-medium" style={{ color: "#1C1424" }}>{(page - 1) * 20 + 1}</span>
          {" – "}
          <span className="font-medium" style={{ color: "#1C1424" }}>{Math.min(page * 20, total)}</span>
          {" of "}
          <span className="font-medium" style={{ color: "#1C1424" }}>{total}</span>
          {" listings"}
        </p>
        <div className="flex gap-2">
          <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="btn-ghost" style={{ padding: "7px 16px" }}>
            Previous
          </button>
          <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="btn-ghost" style={{ padding: "7px 16px" }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
