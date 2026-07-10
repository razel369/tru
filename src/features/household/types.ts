/**
 * PawPair — household and auth types.
 *
 * docs/AAA-HANDOFF.md §5 mandates the following entities and
 * relationships:
 * - An owner creates a household.
 * - Members join through an expiring universal link or short
 *   invite code.
 * - Roles: owner, caregiver, viewer.
 * - Permission checks must exist in Postgres RLS, not only in
 *   the client.
 * - Revoked members lose access immediately after sync.
 * - Audit member joins, removals, and role changes.
 *
 * This module holds the client-side shapes. The server enforces
 * RLS; the client mirrors the contract.
 */

export type CaregiverRole = "owner" | "caregiver" | "viewer";

export interface User {
  id: string;
  displayName: string;
  /** Optional avatar URL once we have a profile photo flow. */
  avatarUrl?: string | null;
  /** Stable per-user color used in the dose timeline. */
  accentColor: string;
  createdAtUtc: string;
  archivedAtUtc: string | null;
}

export interface Household {
  id: string;
  name: string;
  ownerUserId: string;
  createdAtUtc: string;
  archivedAtUtc: string | null;
}

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: CaregiverRole;
  joinedAtUtc: string;
  removedAtUtc: string | null;
}

export interface HouseholdInvite {
  id: string;
  householdId: string;
  /** Short-lived token, either a universal-link slug or a 6-digit code. */
  token: string;
  role: CaregiverRole;
  createdByUserId: string;
  createdAtUtc: string;
  expiresAtUtc: string;
  consumedAtUtc: string | null;
  consumedByUserId: string | null;
}

export interface AuthSession {
  user: User;
  /** Token issued by the auth provider. Stage 8 ships a stub. */
  token: string;
  /** When the token expires; refresh before this. */
  expiresAtUtc: string;
}

/** Outbox mutations the client queues for the server. */
export type SyncEntity =
  | "dose_events"
  | "medications"
  | "schedules"
  | "household_members";

export type SyncOp = "insert" | "update" | "delete";

export interface SyncOutboxEntry {
  id: string;
  entity: SyncEntity;
  entityId: string;
  op: SyncOp;
  payload: string;
  createdAtUtc: string;
  attemptCount: number;
  lastError: string | null;
  /** Hash of (entity, entityId, op, payload) used for idempotency. */
  idempotencyKey: string;
}

/** A detected double-log: two caregivers marked the same
 * scheduled dose as terminal within the conflict window. */
export interface DoseConflict {
  scheduledDoseKey: string;
  firstEvent: {
    id: string;
    completedAtUtc: string;
    completedByUserId: string;
    completedByDisplayName: string;
  };
  secondEvent: {
    id: string;
    completedAtUtc: string;
    completedByUserId: string;
    completedByDisplayName: string;
  };
}
