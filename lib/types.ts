// ─── Enums ────────────────────────────────────────────────────────────────────

export enum UserRole {
  RENTER = "RENTER",
  OWNER = "OWNER",
  CONCIERGE = "CONCIERGE",
  MODERATOR = "MODERATOR",
  ADMIN = "ADMIN",
}

export enum OwnerType {
  INDIVIDUAL = "INDIVIDUAL",
  SHOP = "SHOP",
  BRAND = "BRAND",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
}

export enum KycStatus {
  NONE = "NONE",
  PENDING = "PENDING",
  VERIFIED = "VERIFIED",
  REJECTED = "REJECTED",
}

export enum ListingStatus {
  DRAFT = "DRAFT",
  PENDING_REVIEW = "PENDING_REVIEW",
  LIVE = "LIVE",
  PAUSED = "PAUSED",
  RENTED_OUT = "RENTED_OUT",
  REJECTED = "REJECTED",
}

export enum BookingStatus {
  REQUESTED = "REQUESTED",
  ACCEPTED = "ACCEPTED",
  PAID = "PAID",
  DISPATCHED = "DISPATCHED",
  ACTIVE = "ACTIVE",
  RETURNED = "RETURNED",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
  DISPUTED = "DISPUTED",
}

export enum Fulfillment {
  HUB_HANDOVER = "HUB_HANDOVER",
  DELIVERY = "DELIVERY",
}

export enum Gender {
  MEN = "MEN",
  WOMEN = "WOMEN",
  UNISEX = "UNISEX",
  KIDS_BOY = "KIDS_BOY",
  KIDS_GIRL = "KIDS_GIRL",
}

export enum Authenticity {
  ORIGINAL = "ORIGINAL",
  REPLICA = "REPLICA",
  CUSTOM_MADE = "CUSTOM_MADE",
}

export enum ListingCondition {
  NEW_WITH_TAGS = "NEW_WITH_TAGS",
  LIKE_NEW = "LIKE_NEW",
  GENTLY_USED = "GENTLY_USED",
  VISIBLE_WEAR = "VISIBLE_WEAR",
}

export enum ListingColorRole {
  PRIMARY = "PRIMARY",
  SECONDARY = "SECONDARY",
  ACCENT = "ACCENT",
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  name: string | null;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roles: UserRole[];
  ownerType: OwnerType | null;
  status: UserStatus;
  kycStatus: KycStatus;
  createdAt: string;
}

export interface Media {
  id: string;
  listingId: string;
  type: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  orderIndex: number;
  isCover: boolean;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
}

export interface Listing {
  id: string;
  title: string;
  description: string | null;
  rentalPrice: number;
  securityDeposit: number;
  cleaningFee: number;
  status: ListingStatus;
  categoryId: string;
  ownerId: string;
  gender: Gender | null;
  authenticity: Authenticity | null;
  condition: ListingCondition | null;
  quantity: number;
  createdAt: string;
  media: Media[];
  owner?: Profile;
  category?: Category;
}

export interface Booking {
  id: string;
  listingId: string;
  listingUnitId: string;
  renterId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  eventDate: string | null;
  status: BookingStatus;
  fulfillment: Fulfillment;
  rentalAmount: number;
  depositAmount: number;
  cleaningFee: number;
  platformCommission: number;
  payoutAmount: number;
  createdAt: string;
  listing?: { id: string; title: string; ownerId: string };
  renter?: Profile;
  owner?: Profile;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
