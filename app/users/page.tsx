"use client";

import { useState, type FormEvent } from "react";
import api from "@/lib/api";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Profile {
  id: string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  city?: string;
  country?: string;
  avatarUrl?: string;
  roles: string[];
  ownerType?: string;
  status?: string;
  kycStatus?: string;
  createdAt?: string;
}

type UserRole = "RENTER" | "OWNER" | "CONCIERGE" | "MODERATOR" | "ADMIN";
type OwnerType = "INDIVIDUAL" | "SHOP" | "BRAND";
type Status = "ACTIVE" | "SUSPENDED";
type KycStatus = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

const ALL_ROLES: UserRole[] = [
  "RENTER",
  "OWNER",
  "CONCIERGE",
  "MODERATOR",
  "ADMIN",
];
const ALL_OWNER_TYPES: OwnerType[] = ["INDIVIDUAL", "SHOP", "BRAND"];
const ALL_STATUSES: Status[] = ["ACTIVE", "SUSPENDED"];
const ALL_KYC: KycStatus[] = ["NONE", "PENDING", "VERIFIED", "REJECTED"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function roleBadgeColor(role: string) {
  const map: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-800",
    MODERATOR: "bg-purple-100 text-purple-800",
    OWNER: "bg-blue-100 text-blue-800",
    RENTER: "bg-green-100 text-green-800",
    CONCIERGE: "bg-yellow-100 text-yellow-800",
  };
  return map[role] ?? "bg-gray-100 text-gray-800";
}

function statusBadgeColor(status: string) {
  return status === "ACTIVE"
    ? "bg-green-100 text-green-800"
    : "bg-red-100 text-red-800";
}

function kycBadgeColor(kyc: string) {
  const map: Record<string, string> = {
    VERIFIED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    REJECTED: "bg-red-100 text-red-800",
    NONE: "bg-gray-100 text-gray-600",
  };
  return map[kyc] ?? "bg-gray-100 text-gray-600";
}

function initials(profile: Profile) {
  const name = profile.fullName ?? profile.name ?? profile.email ?? "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ------------------------------------------------------------------ */
/*  Page component                                                     */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  /* Search state */
  const [userId, setUserId] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  /* Profile state */
  const [profile, setProfile] = useState<Profile | null>(null);

  /* Edit state */
  const [editRoles, setEditRoles] = useState<UserRole[]>([]);
  const [editOwnerType, setEditOwnerType] = useState<OwnerType>("INDIVIDUAL");
  const [editStatus, setEditStatus] = useState<Status>("ACTIVE");
  const [editKyc, setEditKyc] = useState<KycStatus>("NONE");
  const [saving, setSaving] = useState(false);

  /* Toast */
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  /* ---- Search ---- */

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const trimmed = userId.trim();
    if (!trimmed) return;

    setSearching(true);
    setSearchError(null);
    setProfile(null);

    try {
      const { data } = await api.get<Profile>(`/admin/users/${trimmed}`);
      setProfile(data);
      setEditRoles((data.roles ?? []) as UserRole[]);
      setEditOwnerType((data.ownerType as OwnerType) ?? "INDIVIDUAL");
      setEditStatus((data.status as Status) ?? "ACTIVE");
      setEditKyc((data.kycStatus as KycStatus) ?? "NONE");
    } catch (err: unknown) {
      const status =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;
      setSearchError(
        status === 404
          ? "User not found. Please check the ID and try again."
          : "Failed to fetch user. Please try again.",
      );
    } finally {
      setSearching(false);
    }
  }

  /* ---- Save ---- */

  async function handleSave() {
    if (!profile) return;
    setSaving(true);

    try {
      const body: Record<string, unknown> = {
        roles: editRoles,
        status: editStatus,
        kycStatus: editKyc,
      };
      if (editRoles.includes("OWNER")) {
        body.ownerType = editOwnerType;
      }

      await api.patch(`/admin/users/${profile.id}/roles`, body);

      /* Refresh profile */
      const { data } = await api.get<Profile>(`/admin/users/${profile.id}`);
      setProfile(data);
      showToast("Changes saved successfully.", "success");
    } catch {
      showToast("Failed to save changes. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  }

  /* ---- Render ---- */

  const displayName =
    profile?.fullName ?? profile?.name ?? profile?.email ?? "Unknown";

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <label
              htmlFor="uid"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              User ID
            </label>
            <input
              id="uid"
              type="text"
              placeholder="Enter UUID..."
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={searching || !userId.trim()}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
          >
            {searching ? "Searching..." : "Look up User"}
          </button>
        </form>

        {/* Error */}
        {searchError && (
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {searchError}
          </div>
        )}

        {/* Profile card */}
        {profile && (
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {initials(profile)}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-gray-900">
                  {displayName}
                </h2>
                {profile.email && (
                  <p className="text-sm text-gray-500">{profile.email}</p>
                )}

                {/* Role badges */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.roles.map((role) => (
                    <span
                      key={role}
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${roleBadgeColor(role)}`}
                    >
                      {role}
                    </span>
                  ))}
                </div>

                {/* Status badges */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile.ownerType && (
                    <span className="inline-block rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                      {profile.ownerType}
                    </span>
                  )}
                  {profile.status && (
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeColor(profile.status)}`}
                    >
                      {profile.status}
                    </span>
                  )}
                  {profile.kycStatus && (
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${kycBadgeColor(profile.kycStatus)}`}
                    >
                      KYC: {profile.kycStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 border-t pt-4 text-sm">
              {profile.phone && (
                <div>
                  <span className="font-medium text-gray-500">Phone</span>
                  <p className="text-gray-900">{profile.phone}</p>
                </div>
              )}
              {profile.city && (
                <div>
                  <span className="font-medium text-gray-500">City</span>
                  <p className="text-gray-900">{profile.city}</p>
                </div>
              )}
              {profile.country && (
                <div>
                  <span className="font-medium text-gray-500">Country</span>
                  <p className="text-gray-900">{profile.country}</p>
                </div>
              )}
              {profile.createdAt && (
                <div>
                  <span className="font-medium text-gray-500">Joined</span>
                  <p className="text-gray-900">
                    {new Date(profile.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <span className="font-medium text-gray-500">ID</span>
                <p className="break-all font-mono text-xs text-gray-700">
                  {profile.id}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Edit panel */}
        {profile && (
          <div className="space-y-5 rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit User Settings
            </h3>

            {/* Roles */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">
                Roles
              </legend>
              <div className="flex flex-wrap gap-4">
                {ALL_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex items-center gap-2 text-sm text-gray-800"
                  >
                    <input
                      type="checkbox"
                      checked={editRoles.includes(role)}
                      onChange={(e) => {
                        setEditRoles((prev) =>
                          e.target.checked
                            ? [...prev, role]
                            : prev.filter((r) => r !== role),
                        );
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {role}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Owner Type (only when OWNER selected) */}
            {editRoles.includes("OWNER") && (
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-gray-700">
                  Owner Type
                </legend>
                <div className="flex flex-wrap gap-4">
                  {ALL_OWNER_TYPES.map((ot) => (
                    <label
                      key={ot}
                      className="flex items-center gap-2 text-sm text-gray-800"
                    >
                      <input
                        type="radio"
                        name="ownerType"
                        checked={editOwnerType === ot}
                        onChange={() => setEditOwnerType(ot)}
                        className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {ot}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            {/* Status */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">
                Status
              </legend>
              <div className="flex flex-wrap gap-4">
                {ALL_STATUSES.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 text-sm text-gray-800"
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={editStatus === s}
                      onChange={() => setEditStatus(s)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {s}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* KYC Status */}
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">
                KYC Status
              </legend>
              <div className="flex flex-wrap gap-4">
                {ALL_KYC.map((k) => (
                  <label
                    key={k}
                    className="flex items-center gap-2 text-sm text-gray-800"
                  >
                    <input
                      type="radio"
                      name="kycStatus"
                      checked={editKyc === k}
                      onChange={() => setEditKyc(k)}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    {k}
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Save */}
            <div className="flex justify-end border-t pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed right-6 bottom-6 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-opacity ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
