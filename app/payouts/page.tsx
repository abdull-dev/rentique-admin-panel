"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import RequireAdmin from "@/components/require-admin";
import Spinner from "@/components/spinner";
import Modal from "@/components/modal";
import { ToastContainer, useToasts } from "@/components/toast";
import { formatPKR } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { OwedPayout, PayoutAccountType } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PAYOUT_TYPE_LABELS: Record<PayoutAccountType, string> = {
  BANK: "Bank",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
};

function ownerName(o: OwedPayout): string {
  return o.owner.fullName || o.owner.name || o.owner.email || "Unknown owner";
}

function destination(o: OwedPayout): string {
  const acc = o.payoutAccount;
  if (!acc) return "No payout account";
  if (acc.type === PayoutAccountType.BANK) {
    return `${acc.bankName ?? "Bank"} · ${acc.iban ?? "—"}`;
  }
  return `${PAYOUT_TYPE_LABELS[acc.type]} · ${acc.walletPhone ?? "—"}`;
}

// A transfer reference must be a real bank/wallet reference, not just any
// non-blank keystroke (e.g. "."). Require a few meaningful characters.
const MIN_REFERENCE_LENGTH = 4;
function isValidReference(ref: string): boolean {
  const trimmed = ref.trim();
  return trimmed.length >= MIN_REFERENCE_LENGTH && /[a-zA-Z0-9]/.test(trimmed);
}

/** Response of POST /admin/payouts/disburse (totalAmount is a Decimal string). */
interface DisburseResult {
  disbursedCount: number;
  alreadySettled: number;
  totalAmount: string;
}

/**
 * An owner settled in this session. Kept so the admin can (re-)send the chat
 * notification even after the owed row is gone — without it, skipping or a
 * failed notify would strand the owner with no way back (the #3 orphan).
 */
interface PaidRecord {
  ownerId: string;
  name: string;
  settledAmount: string;
  reference: string;
  prefilledMessage: string;
  notified: boolean;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function PayoutsPage() {
  return (
    <RequireAdmin>
      <PayoutsContent />
    </RequireAdmin>
  );
}

function PayoutsContent() {
  const [owed, setOwed] = useState<OwedPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OwedPayout | null>(null);

  // Owners paid in this session, newest first, for the re-notify panel.
  const [paid, setPaid] = useState<PaidRecord[]>([]);
  const [notifyTarget, setNotifyTarget] = useState<PaidRecord | null>(null);

  const { toasts, addToast, dismissToast } = useToasts();

  const fetchOwed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<OwedPayout[]>("/admin/payouts/owed");
      setOwed(res.data);
    } catch {
      setError("Failed to load outstanding payouts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOwed();
  }, [fetchOwed]);

  // A payout was recorded: drop the owed row and remember it for re-notify.
  const handleDisbursed = (record: PaidRecord) => {
    setOwed((prev) => prev.filter((o) => o.owner.id !== record.ownerId));
    setPaid((prev) => [
      record,
      ...prev.filter((p) => p.ownerId !== record.ownerId),
    ]);
  };

  const markNotified = (ownerId: string) => {
    setPaid((prev) =>
      prev.map((p) => (p.ownerId === ownerId ? { ...p, notified: true } : p)),
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Payouts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Outstanding balances owed to owners. Make the bank transfer, then
            record it here.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner className="h-8 w-8 text-indigo-600" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchOwed}
              className="mt-3 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : owed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
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
              Nothing owed
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              All owners have been paid out.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Owner", "Owed", "Bookings", "Destination", "Status", ""].map(
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
                  {owed.map((o) => (
                    <tr key={o.owner.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {ownerName(o)}
                        </div>
                        {o.owner.email && (
                          <div className="text-xs text-gray-500">
                            {o.owner.email}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900">
                        {formatPKR(o.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {o.payoutCount}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {destination(o)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {o.payable ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Ready
                          </span>
                        ) : (
                          // #10: a non-payable row is a dead end here — link to
                          // the verification queue so the admin can act on it.
                          <Link
                            href="/payout-accounts"
                            className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 hover:bg-yellow-200"
                            title="Verify this owner's payout account"
                          >
                            Account not verified →
                          </Link>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <button
                          onClick={() => setSelected(o)}
                          disabled={!o.payable}
                          title={
                            o.payable
                              ? undefined
                              : "Owner's payout account must be verified first"
                          }
                          className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark paid
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* #3: re-notify path — owners paid in this session can be notified
            again (or for the first time, if notify was skipped/failed). */}
        {paid.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-700">
              Recently paid (this session)
            </h2>
            <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
              <ul className="divide-y divide-gray-100">
                {paid.map((p) => (
                  <li
                    key={p.ownerId}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {p.name}{" "}
                        <span className="font-normal text-gray-500">
                          · {p.settledAmount}
                        </span>
                      </p>
                      <p className="truncate font-mono text-xs text-gray-400">
                        Ref: {p.reference}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {p.notified ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                          ✓ Notified
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-700">
                          Not notified
                        </span>
                      )}
                      <button
                        onClick={() => setNotifyTarget(p)}
                        className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        {p.notified ? "Re-notify" : "Notify"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <DisburseModal
          owed={selected}
          onClose={() => setSelected(null)}
          onDisbursed={handleDisbursed}
          onNotified={markNotified}
          addToast={addToast}
        />
      )}

      {notifyTarget && (
        <NotifyModal
          record={notifyTarget}
          onClose={() => setNotifyTarget(null)}
          onNotified={markNotified}
          addToast={addToast}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Disburse + notify modal (two phases)
// ---------------------------------------------------------------------------

function DisburseModal({
  owed,
  onClose,
  onDisbursed,
  onNotified,
  addToast,
}: {
  owed: OwedPayout;
  onClose: () => void;
  onDisbursed: (record: PaidRecord) => void;
  onNotified: (ownerId: string) => void;
  addToast: (message: string, type: "success" | "error") => void;
}) {
  type Phase = "disburse" | "notify";
  const [phase, setPhase] = useState<Phase>("disburse");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const name = ownerName(owed);
  const amount = formatPKR(owed.totalAmount);

  async function handleDisburse(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidReference(reference)) {
      setError(
        `Enter the transfer reference (at least ${MIN_REFERENCE_LENGTH} characters).`,
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ref = reference.trim();
      const { data } = await api.post<DisburseResult>(
        "/admin/payouts/disburse",
        { ownerId: owed.owner.id, payoutIds: owed.payoutIds, reference: ref },
      );

      // The backend flips only rows still PENDING. A zero count means nothing
      // moved (already settled / a lost double-submit race) — don't claim a
      // fresh transfer was recorded. The owner is settled either way, so drop
      // the row and close rather than advancing to notify.
      if (data.disbursedCount === 0) {
        addToast(
          `${name} was already settled — no new payout recorded.`,
          "error",
        );
        onDisbursed({
          ownerId: owed.owner.id,
          name,
          settledAmount: formatPKR(data.totalAmount),
          reference: ref,
          prefilledMessage: "",
          notified: false,
        });
        onClose();
        return;
      }

      // Use the amount the backend actually settled, not the snapshot total.
      const settled = formatPKR(data.totalAmount);
      const prefilled =
        `Hi ${name}, we've transferred your payout of ${settled} to your ` +
        `registered ${destination(owed)}. Reference: ${ref}. ` +
        `Thank you for renting with Rentique!`;
      addToast(`Marked ${settled} paid to ${name}.`, "success");
      onDisbursed({
        ownerId: owed.owner.id,
        name,
        settledAmount: settled,
        reference: ref,
        prefilledMessage: prefilled,
        notified: false,
      });
      setMessage(prefilled);
      setPhase("notify");
    } catch (err) {
      setError(errorMessage(err, "Failed to record the disbursement."));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/admin/payouts/notify", {
        ownerId: owed.owner.id,
        message: message.trim(),
      });
      addToast(`Notified ${name}.`, "success");
      onNotified(owed.owner.id);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Failed to send the notification."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={phase === "disburse" ? "Record payout" : "Notify owner"}
      subtitle={
        <>
          {name} · {amount} · {owed.payoutCount} booking
          {owed.payoutCount === 1 ? "" : "s"}
        </>
      }
      onClose={onClose}
    >
      {phase === "disburse" ? (
        <form onSubmit={handleDisburse}>
          <div className="space-y-5 px-6 py-5">
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
              <p className="text-gray-500">Transfer destination</p>
              <p className="mt-0.5 font-mono text-xs text-gray-900">
                {destination(owed)}
              </p>
              <p className="mt-2 text-gray-500">Account title</p>
              <p className="mt-0.5 text-gray-900">
                {owed.payoutAccount?.accountTitle ?? "—"}
              </p>
            </div>

            <div>
              <label
                htmlFor="reference"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Bank transfer reference
              </label>
              <input
                id="reference"
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g. IBFT-20260616-00482"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Make the bank transfer first, then paste its reference here.
                This marks all {owed.payoutCount} outstanding payout
                {owed.payoutCount === 1 ? "" : "s"} as paid.
              </p>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !isValidReference(reference)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Spinner />}
              {submitting ? "Recording..." : "Mark paid"}
            </button>
          </div>
        </form>
      ) : (
        <NotifyForm
          message={message}
          setMessage={setMessage}
          submitting={submitting}
          error={error}
          name={name}
          onSubmit={handleNotify}
          onClose={onClose}
          closeLabel="Skip"
          intro={`Payout recorded. Send ${name} a chat message to let them know.`}
        />
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Notify-only modal (re-notify a previously paid owner)
// ---------------------------------------------------------------------------

function NotifyModal({
  record,
  onClose,
  onNotified,
  addToast,
}: {
  record: PaidRecord;
  onClose: () => void;
  onNotified: (ownerId: string) => void;
  addToast: (message: string, type: "success" | "error") => void;
}) {
  const [message, setMessage] = useState(
    record.prefilledMessage ||
      `Hi ${record.name}, your payout of ${record.settledAmount} has been ` +
        `transferred. Reference: ${record.reference}. Thank you for renting with Rentique!`,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNotify(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Message cannot be empty.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/admin/payouts/notify", {
        ownerId: record.ownerId,
        message: message.trim(),
      });
      addToast(`Notified ${record.name}.`, "success");
      onNotified(record.ownerId);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Failed to send the notification."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Notify owner"
      subtitle={
        <>
          {record.name} · {record.settledAmount}
        </>
      }
      onClose={onClose}
    >
      <NotifyForm
        message={message}
        setMessage={setMessage}
        submitting={submitting}
        error={error}
        name={record.name}
        onSubmit={handleNotify}
        onClose={onClose}
        closeLabel="Cancel"
        intro={`Send ${record.name} a chat message about their payout.`}
      />
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared notify form body
// ---------------------------------------------------------------------------

function NotifyForm({
  message,
  setMessage,
  submitting,
  error,
  name,
  onSubmit,
  onClose,
  closeLabel,
  intro,
}: {
  message: string;
  setMessage: (v: string) => void;
  submitting: boolean;
  error: string | null;
  name: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  closeLabel: string;
  intro: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4 px-6 py-5">
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-sm text-green-800">{intro}</p>
        </div>
        <div>
          <label
            htmlFor="notifyMessage"
            className="mb-1.5 block text-sm font-medium text-gray-700"
          >
            Message (from &ldquo;Rentique Payouts&rdquo;)
          </label>
          <textarea
            id="notifyMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {closeLabel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <Spinner />}
          {submitting ? "Sending..." : `Notify ${name.split(" ")[0] || "owner"}`}
        </button>
      </div>
    </form>
  );
}
