"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import api from "@/lib/api";
import Spinner from "@/components/spinner";
import { ToastContainer, useToasts } from "@/components/toast";
import { errorMessage } from "@/lib/errors";

interface SellerFeeUser {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  sellerFeePaidAt?: string;
  sellerFeeProofUrl?: string;
}

export default function SellerFeesPage() {
  const [users, setUsers] = useState<SellerFeeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const { toasts, addToast, dismissToast } = useToasts();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<SellerFeeUser[]>("/payments/seller-fee/pending");
      setUsers(data);
    } catch (err) {
      addToast(errorMessage(err, "Something went wrong"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(userId: string) {
    setActionInFlight(userId);
    try {
      await api.post(`/payments/seller-fee/${userId}/approve`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      addToast("Seller account activated!", "success");
    } catch (err) {
      addToast(errorMessage(err, "Something went wrong"), "error");
    } finally {
      setActionInFlight(null);
    }
  }

  async function handleReject(userId: string) {
    setActionInFlight(userId);
    try {
      await api.post(`/payments/seller-fee/${userId}/reject`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      addToast("Proof rejected — user must re-upload.", "success");
    } catch (err) {
      addToast(errorMessage(err, "Something went wrong"), "error");
    } finally {
      setActionInFlight(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1424] font-[family-name:var(--font-headline)]">Seller Fee Approvals</h1>
          <p className="mt-1 text-sm text-[#5B4F62]">
            Review payment proof screenshots and activate seller accounts.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-[999px] border border-[#E8DDE4] bg-white px-4 py-2 text-sm font-medium text-[#1C1424] hover:bg-[#faf4f0]"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-20">
          <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">No pending seller fee approvals.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-[#5B4F62]">{users.length} seller{users.length !== 1 ? "s" : ""} awaiting approval</p>
          {users.map((user) => {
            const isBusy = actionInFlight === user.id;
            const displayName = user.fullName || user.name || user.email || user.id.slice(0, 8);
            const paidDate = user.sellerFeePaidAt
              ? new Date(user.sellerFeePaidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "Unknown";

            return (
              <div key={user.id} className="flex flex-col gap-4 rounded-2xl border border-[#E8DDE4] bg-white p-5 shadow-[0_1px_3px_rgba(28,20,36,0.08)] sm:flex-row">
                {/* Proof screenshot */}
                <div className="relative h-40 w-32 shrink-0 overflow-hidden rounded-xl bg-[#FFFCF6]">
                  {user.sellerFeeProofUrl ? (
                    <Image
                      src={user.sellerFeeProofUrl}
                      alt="Payment proof"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#E8DDE4] text-sm">
                      No image
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <p className="text-base font-semibold text-[#1C1424]">{displayName}</p>
                    {user.email && <p className="mt-0.5 text-sm text-[#5B4F62]">{user.email}</p>}
                    <p className="mt-1 text-sm text-[#5B4F62]/60">Paid: {paidDate}</p>
                    {user.sellerFeeProofUrl && (
                      <a
                        href={user.sellerFeeProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-sm text-[#D6336C] underline hover:text-[#B71F56]"
                      >
                        View full screenshot ↗
                      </a>
                    )}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={isBusy}
                      className="flex-1 rounded-[999px] bg-[#0E8F6B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0A6E52] disabled:opacity-50"
                    >
                      {isBusy ? "…" : "✓ Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(user.id)}
                      disabled={isBusy}
                      className="flex-1 rounded-[999px] border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
                    >
                      {isBusy ? "…" : "✕ Reject"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
