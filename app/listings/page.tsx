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

const STATUS_STYLES: Record<string, string> = {
  LIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-gray-100 text-gray-700",
  DRAFT: "bg-yellow-100 text-yellow-800",
  PENDING_REVIEW: "bg-blue-100 text-blue-800",
  RENTED_OUT: "bg-purple-100 text-purple-800",
  REJECTED: "bg-red-100 text-red-800",
};

function statusLabel(status: string): string {
  return status.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Tab = "pending" | "all";

export default function ListingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  // Pending listings state
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  // All listings state
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Action loading states — track per listing id
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());

  // Toasts
  const { toasts, addToast, dismissToast } = useToasts();

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

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

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (activeTab === "all") {
      fetchAll();
    }
  }, [activeTab, fetchAll]);

  // -----------------------------------------------------------------------
  // Actions
  // -----------------------------------------------------------------------

  const handleApprove = async (id: string, title: string) => {
    setApprovingIds((prev) => new Set(prev).add(id));
    try {
      await api.post(`/admin/listings/${id}/approve`);
      setPendingListings((prev) => prev.filter((l) => l.id !== id));
      addToast(`"${title}" approved successfully.`, "success");
    } catch (err) {
      addToast(errorMessage(err, `Failed to approve "${title}".`), "error");
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
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
      setRejectingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Listings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review and manage all listings on the platform.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex gap-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("pending")}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "pending"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              Pending Review
              {pendingListings.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {pendingListings.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                activeTab === "all"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              All Listings
              {total > 0 && activeTab === "all" && (
                <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {total}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
      </div>

      {/* Toasts */}
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
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        {/* Checkmark icon */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No pending listings
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          All listings have been reviewed. Check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Image */}
      <div className="relative h-48 w-full bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-1">
            {listing.title}
          </h3>
          <span className="shrink-0 text-base font-bold text-indigo-600">
            {formatPKR(listing.rentalPrice)}
          </span>
        </div>

        {listing.category && (
          <p className="mt-1 text-xs font-medium text-gray-500">
            {listing.category.name}
          </p>
        )}

        {/* Owner */}
        {listing.owner && (
          <div className="mt-3 flex items-center gap-2">
            {listing.owner.avatarUrl ? (
              <Image
                src={listing.owner.avatarUrl}
                alt={listing.owner.name || "Owner"}
                width={24}
                height={24}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-medium text-gray-600">
                {(listing.owner.name ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-sm text-gray-700">
              {listing.owner.name ?? "Unknown"}
            </span>
            {listing.owner.ownerType && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {listing.owner.ownerType}
              </span>
            )}
          </div>
        )}

        {/* Submitted date */}
        <p className="mt-2 text-xs text-gray-400">
          Submitted {formatDate(listing.createdAt)}
        </p>

        {/* Description preview */}
        {listing.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {listing.description}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={onApprove}
            disabled={approving || rejecting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
          >
            {approving ? (
              <>
                <Spinner />
                Approving...
              </>
            ) : (
              "Approve"
            )}
          </button>
          <button
            onClick={onReject}
            disabled={approving || rejecting}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
          >
            {rejecting ? (
              <>
                <Spinner />
                Rejecting...
              </>
            ) : (
              "Reject"
            )}
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
        <Spinner className="h-8 w-8 text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium text-gray-900">No listings found</h3>
        <p className="mt-1 text-sm text-gray-500">
          There are no listings to display.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Image
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Owner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {listings.map((listing) => {
                const imageUrl = getCoverImage(listing.media);
                return (
                  <tr key={listing.id} className="hover:bg-gray-50">
                    {/* Image */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-md bg-gray-100">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={listing.title}
                            fill
                            className="object-cover"
                            sizes="40px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg
                              className="h-5 w-5 text-gray-300"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={1}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Title */}
                    <td className="max-w-[200px] truncate px-4 py-3 text-sm font-medium text-gray-900">
                      {listing.title}
                    </td>
                    {/* Category */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {listing.category?.name ?? "-"}
                    </td>
                    {/* Price */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                      {formatPKR(listing.rentalPrice)}
                    </td>
                    {/* Status */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[listing.status] ??
                          "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {statusLabel(listing.status)}
                      </span>
                    </td>
                    {/* Owner */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {listing.owner?.name ?? "-"}
                    </td>
                    {/* Date */}
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {formatDate(listing.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Showing{" "}
          <span className="font-medium">{(page - 1) * 20 + 1}</span>
          {" "}-{" "}
          <span className="font-medium">
            {Math.min(page * 20, total)}
          </span>{" "}
          of <span className="font-medium">{total}</span> listings
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
