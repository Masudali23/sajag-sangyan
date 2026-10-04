import { describe, expect, it } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import {
  hasConfirmedEmail,
  isAuthConnectionFailure,
  rememberedSessionMatches,
  sessionTokenHash,
  readPersistedAuthSession,
} from "../src/lib/auth-verification";
const user = {
  id: "owner-1",
  email: "asha@example.test",
  email_confirmed_at: "2026-10-03T00:00:00Z",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-10-03T00:00:00Z",
} as User;
const session = { user, access_token: "server-session-one" } as Session;
const now = Date.UTC(2026, 9, 4);
describe("confirmed accounts and remembered offline sessions", () => {
  it("reads an expired persisted SDK session only as a receipt-check candidate", () => {
    const stored = {
      ...session,
      expires_at: 1,
      user: { ...user, email_confirmed_at: undefined },
    };
    expect(
      readPersistedAuthSession(
        {
          getItem: (key) =>
            key === "sb-one-auth-token" ? JSON.stringify(stored) : null,
        },
        "https://one.supabase.co",
      ),
    ).toEqual(stored);
    expect(
      readPersistedAuthSession(
        { getItem: () => "bad JSON" },
        "https://one.supabase.co",
      ),
    ).toBeNull();
    expect(
      readPersistedAuthSession(
        { getItem: () => JSON.stringify({ user }) },
        "https://one.supabase.co",
      ),
    ).toBeNull();
    expect(
      readPersistedAuthSession(
        { getItem: () => null },
        "https://two.supabase.co",
      ),
    ).toBeNull();
  });
  it("accepts server-managed email confirmation and rejects editable verification metadata", () => {
    expect(hasConfirmedEmail(user)).toBe(true);
    expect(
      hasConfirmedEmail({
        ...user,
        email_confirmed_at: undefined,
        user_metadata: { email_verified: true, verified: true },
      }),
    ).toBe(false);
    expect(hasConfirmedEmail({ ...user, email_confirmed_at: "invalid" })).toBe(
      false,
    );
    expect(hasConfirmedEmail({ ...user, is_anonymous: true })).toBe(false);
    expect(hasConfirmedEmail({ ...user, email: undefined })).toBe(false);
    expect(hasConfirmedEmail(null)).toBe(false);
  });
  it("binds offline eligibility to the verified project's exact token, owner, email and bounded receipt", async () => {
    const tokenHash = await sessionTokenHash(session.access_token);
    const record = {
      version: 1,
      project: "https://one.supabase.co",
      owner: user.id,
      email: user.email,
      emailConfirmedAt: user.email_confirmed_at,
      tokenHash,
      checkedAt: now,
    };
    expect(
      rememberedSessionMatches(record, session, record.project, tokenHash, now),
    ).toBe(true);
    for (const changed of [
      { ...record, tokenHash: "a".repeat(64) },
      { ...record, owner: "owner-2" },
      { ...record, email: "second@example.test" },
      { ...record, project: "https://two.supabase.co" },
      { ...record, checkedAt: now + 1 },
      { ...record, checkedAt: now - 31 * 24 * 3600000 },
      { ...record, emailConfirmedAt: null },
      { ...record, version: 2 },
      null,
    ])
      expect(
        rememberedSessionMatches(
          changed,
          session,
          record.project,
          tokenHash,
          now,
        ),
      ).toBe(false);
    expect(
      rememberedSessionMatches(
        record,
        { ...session, user: { ...user, is_anonymous: true } },
        record.project,
        tokenHash,
        now,
      ),
    ).toBe(false);
    expect(
      rememberedSessionMatches(record, session, record.project, "bad", now),
    ).toBe(false);
  });
  it("never treats an authorization rejection as an offline outage", () => {
    for (const status of [400, 401, 403, 404])
      expect(isAuthConnectionFailure({ status })).toBe(false);
    for (const status of [0, 429, 500, 503])
      expect(isAuthConnectionFailure({ status })).toBe(true);
    expect(isAuthConnectionFailure(new TypeError("Failed to fetch"))).toBe(
      true,
    );
  });
});
