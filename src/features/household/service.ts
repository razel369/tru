import { clock } from "../../data/database/types";
import { uuid } from "../../data/database/uuid";
import { currentUser } from "./auth";
import type {
  Household,
  HouseholdInvite,
  HouseholdMember,
  CaregiverRole,
} from "./types";

/**
 * PawPair — household service.
 *
 * docs/AAA-HANDOFF.md §5: an owner creates a household and
 * members join through an expiring universal link or short
 * invite code. Revoked members lose access immediately after
 * sync. Audit member joins, removals, and role changes.
 *
 * Stage 8 ships the in-memory state machine. The real
 * Supabase implementation lands in stage 8-final and keeps
 * the same surface so the host code is portable.
 */

let households: Household[] = [];
let members: HouseholdMember[] = [];
let invites: HouseholdInvite[] = [];

export function __resetHouseholdStateForTests(): void {
  households = [];
  members = [];
  invites = [];
}

export function createHousehold(name: string): Household {
  const user = currentUser();
  if (!user) throw new Error("createHousehold: not signed in");
  const id = `h-${uuid()}`;
  const household: Household = {
    id,
    name,
    ownerUserId: user.id,
    createdAtUtc: clock.nowIso(),
    archivedAtUtc: null,
  };
  households = [...households, household];
  members = [
    ...members,
    {
      id: `m-${uuid()}`,
      householdId: id,
      userId: user.id,
      role: "owner",
      joinedAtUtc: clock.nowIso(),
      removedAtUtc: null,
    },
  ];
  return household;
}

export function listHouseholdsForUser(): Household[] {
  const user = currentUser();
  if (!user) return [];
  const userHouseholdIds = new Set(
    members
      .filter((m) => m.userId === user.id && m.removedAtUtc === null)
      .map((m) => m.householdId),
  );
  return households.filter(
    (h) => userHouseholdIds.has(h.id) && h.archivedAtUtc === null,
  );
}

export function listMembers(householdId: string): HouseholdMember[] {
  return members.filter(
    (m) => m.householdId === householdId && m.removedAtUtc === null,
  );
}

export function createInvite(
  householdId: string,
  role: CaregiverRole = "caregiver",
  ttlMinutes = 60 * 24,
): HouseholdInvite {
  const user = currentUser();
  if (!user) throw new Error("createInvite: not signed in");
  const id = `i-${uuid()}`;
  const token = `${Math.random().toString(36).slice(2, 8)}-${uuid().slice(0, 4)}`;
  const now = clock.now();
  const expires = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const invite: HouseholdInvite = {
    id,
    householdId,
    token,
    role,
    createdByUserId: user.id,
    createdAtUtc: now.toISOString(),
    expiresAtUtc: expires.toISOString(),
    consumedAtUtc: null,
    consumedByUserId: null,
  };
  invites = [...invites, invite];
  return invite;
}

export function acceptInvite(token: string): HouseholdMember | null {
  const user = currentUser();
  if (!user) throw new Error("acceptInvite: not signed in");
  const invite = invites.find(
    (i) => i.token === token && i.consumedAtUtc === null,
  );
  if (!invite) return null;
  if (new Date(invite.expiresAtUtc).getTime() < clock.now().getTime()) {
    return null;
  }
  invites = invites.map((i) =>
    i.id === invite.id
      ? {
          ...i,
          consumedAtUtc: clock.nowIso(),
          consumedByUserId: user.id,
        }
      : i,
  );
  const member: HouseholdMember = {
    id: `m-${uuid()}`,
    householdId: invite.householdId,
    userId: user.id,
    role: invite.role,
    joinedAtUtc: clock.nowIso(),
    removedAtUtc: null,
  };
  members = [...members, member];
  return member;
}

export function revokeMember(
  householdId: string,
  userId: string,
): HouseholdMember | null {
  const member = members.find(
    (m) =>
      m.householdId === householdId &&
      m.userId === userId &&
      m.removedAtUtc === null,
  );
  if (!member) return null;
  if (member.role === "owner") return null; // owner cannot self-revoke
  members = members.map((m) =>
    m.id === member.id ? { ...m, removedAtUtc: clock.nowIso() } : m,
  );
  return members.find((m) => m.id === member.id) ?? null;
}

export function findInvite(token: string): HouseholdInvite | null {
  return invites.find((i) => i.token === token) ?? null;
}
