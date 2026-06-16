"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import RequireAdmin from "@/components/require-admin";
import Spinner from "@/components/spinner";
import { ToastContainer, useToasts } from "@/components/toast";
import { errorMessage } from "@/lib/errors";
import {
  AdminPayoutAccount,
  PayoutAccountStatus,
  PayoutAccountType,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ownerName(a: AdminPayoutAccount): string {
  return a.user.fullName || a.user.name || a.user.email || "Unknown user";
}

const STATUS_STYLES: Record<PayoutAccountStatus, string> = {
  UNVERIFIED: "bg-yellow-100 text-yellow-800",
  VERIFIED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
};

const TYPE_LABELS: Record<PayoutAccountType, string> = {
  BANK: "Bank",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

type Tab = "pending" | "all";

export default function PayoutAccountsPage() {
  return (
    <RequireAdmin>
      <PayoutAccountsContent />
    </RequireAdmin>
  );
}

function PayoutAccountsContent() {
  const [activeTab, setActiveTab] = useState<Tab>("pending");

  const [pending, setPending] = useState<AdminPayoutAccount[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const [all, setAll] = useState<AdminPayoutAccount[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [rejectingIds, setRejectingIds] = useState<Set<string>>(new Set());

  const { toasts, addToast, dismissToast } = useToasts();

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await api.get<AdminPayoutAccount[]>("/admin/payout-accounts", {
        params: { status: PayoutAccountStatus.UNVERIFIED },
      });
      setPending(res.data);
    } catch {
      setPendingError("Failed to load pending payout accounts.");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setAllLoading(true);
    setAllError(null);
    try {
      const res = await api.get<AdminPayoutAccount[]>("/admin/payout-accounts");
      setAll(res.data);
    } catch {
      setAllError("Failed to load payout accounts.");
    } finally {
      setAllLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (activeTab === "all") fetchAll();
  }, [activeTab, fetchAll]);

  const handleVerify = async (account: AdminPayoutAccount) => {
    setVerifyingIds((prev) => new Set(prev).add(account.id));
    setPending((prev) => prev.filter((a) => a.id !== account.id));
    try {
      await api.post(`/admin/users/${account.userId}/payout-account/verify`);
      addToast(`Verified ${ownerName(account)}'s account.`, "success");
    } catch (err) {
      fetchPending();
      addToast(
        errorMessage(err, `Failed to verify ${ownerName(account)}'s account.`),
        "error",
      );
    } finally {
      setVerifyingIds((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  const handleReject = async (account: AdminPayoutAccount) => {
    setRejectingIds((prev) => new Set(prev).add(account.id));
    setPending((prev) => prev.filter((a) => a.id !== account.id));
    try {
      await api.post(`/admin/users/${account.userId}/payout-account/reject`);
      addToast(`Rejected ${ownerName(account)}'s account.`, "success");
    } catch (err) {
      fetchPending();
      addToast(
        errorMessage(err, `Failed to reject ${ownerName(account)}'s account.`),
        "error",
      );
    } finally {
      setRejectingIds((prev) => {
        const next = new Set(prev);
        next.delete(account.id);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Payout Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Verify owners&apos; bank and wallet details before they can be paid.
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
              Awaiting Verification
              {pending.length > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {pending.length}
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
              All Accounts
            </button>
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {activeTab === "pending" ? (
          <PendingTab
            accounts={pending}
            loading={pendingLoading}
            error={pendingError}
            verifyingIds={verifyingIds}
            rejectingIds={rejectingIds}
            onVerify={handleVerify}
            onReject={handleReject}
            onRetry={fetchPending}
          />
        ) : (
          <AllTab
            accounts={all}
            loading={allLoading}
            error={allError}
            onRetry={fetchAll}
          />
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: account detail rows
// ---------------------------------------------------------------------------

function AccountDetails({ account }: { account: AdminPayoutAccount }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      <Detail label="Account title" value={account.accountTitle} />
      <Detail label="Type" value={TYPE_LABELS[account.type]} />
      {account.type === PayoutAccountType.BANK ? (
        <>
          <Detail label="Bank" value={account.bankName} />
          <Detail label="IBAN" value={account.iban} mono />
        </>
      ) : (
        <Detail label="Wallet number" value={account.walletPhone} mono />
      )}
      <Detail label="CNIC" value={account.cnic} mono />
    </dl>
  );
}

function Detail({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {label}
      </dt>
      <dd
        className={`text-gray-900 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending tab
// ---------------------------------------------------------------------------

function PendingTab({
  accounts,
  loading,
  error,
  verifyingIds,
  rejectingIds,
  onVerify,
  onReject,
  onRetry,
}: {
  accounts: AdminPayoutAccount[];
  loading: boolean;
  error: string | null;
  verifyingIds: Set<string>;
  rejectingIds: Set<string>;
  onVerify: (a: AdminPayoutAccount) => void;
  onReject: (a: AdminPayoutAccount) => void;
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
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-8 w-8 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No accounts awaiting verification
        </h3>
        <p className="mt-1 text-sm text-gray-500">All caught up.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {accounts.map((account) => {
        const verifying = verifyingIds.has(account.id);
        const rejecting = rejectingIds.has(account.id);
        return (
          <div
            key={account.id}
            className="overflow-hidden rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  {ownerName(account)}
                </h3>
                {account.user.email && (
                  <p className="text-xs text-gray-500">{account.user.email}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                {TYPE_LABELS[account.type]}
              </span>
            </div>

            <AccountDetails account={account} />

            <p className="mt-2 text-xs text-gray-400">
              Submitted {formatDate(account.createdAt)}
            </p>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => onVerify(account)}
                disabled={verifying || rejecting}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
              >
                {verifying ? (
                  <>
                    <Spinner />
                    Verifying...
                  </>
                ) : (
                  "Verify"
                )}
              </button>
              <button
                onClick={() => onReject(account)}
                disabled={verifying || rejecting}
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
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// All tab
// ---------------------------------------------------------------------------

function AllTab({
  accounts,
  loading,
  error,
  onRetry,
}: {
  accounts: AdminPayoutAccount[];
  loading: boolean;
  error: string | null;
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
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h3 className="text-lg font-medium text-gray-900">No payout accounts</h3>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Owner", "Type", "Account title", "Destination", "Status", "Created"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {accounts.map((a) => (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {ownerName(a)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {TYPE_LABELS[a.type]}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {a.accountTitle}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {a.type === PayoutAccountType.BANK
                    ? a.iban || "—"
                    : a.walletPhone || "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status]}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {formatDate(a.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
