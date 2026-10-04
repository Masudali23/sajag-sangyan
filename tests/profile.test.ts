import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  cleanProfileName,
  profileFor,
  validEmailCode,
} from "../src/lib/profile";
const user = (name: unknown, email = "asha@example.test") =>
  ({
    id: "test-user",
    aud: "authenticated",
    app_metadata: {},
    created_at: "2026-10-03T00:00:00Z",
    user_metadata: { full_name: name },
    email,
  }) as User;
describe("profile display and authorized email codes", () => {
  it("uses optional name and two initials without exposing arbitrary metadata", () => {
    expect(profileFor(user("  Asha Rao  "))).toMatchObject({
      name: "Asha Rao",
      label: "Asha Rao",
      initials: "AR",
      email: "asha@example.test",
    });
  });
  it("falls back to email when name is missing, blank or malformed", () => {
    for (const name of [null, undefined, "  ", { html: "bad" }, 27])
      expect(profileFor(user(name))).toMatchObject({
        name: "",
        label: "asha@example.test",
        initials: "A",
      });
  });
  it("preserves Hindi graphemes in initials", () => {
    expect(profileFor(user("श्रेया वर्मा")).initials).toBe("श्रेव");
  });
  it("removes control and bidi override characters and bounds metadata", () => {
    expect(cleanProfileName("\u202eAsha\n Rao\u0000")).toBe("Asha Rao");
    expect(cleanProfileName("a".repeat(100))).toHaveLength(80);
  });
  it("does not turn markup into a URL or strip it into a claimed identity", () => {
    expect(profileFor(user("<script>alert(1)</script>")).label).toBe(
      "<script>alert(1)</script>",
    );
  });
  it.each(["123456", "1234567", "12345678", "123456789", "0123456789"])(
    "accepts the configured email-code length: %s",
    (code) => expect(validEmailCode(code)).toBe(true),
  );
  it.each(["", "12345", "12345678901", "12a456", "1e2345", "123.45", "१२३४५६"])(
    "rejects malformed code: %s",
    (code) => expect(validEmailCode(code)).toBe(false),
  );
});
