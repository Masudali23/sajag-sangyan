import { describe, expect, it, vi } from "vitest";
import { requireSignupConfirmation } from "../src/lib/signup-settings";

describe("first email confirmation preflight", () => {
  it("checks public configuration without sending signup credentials", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ mailer_autoconfirm: false })),
      );
    await requireSignupConfirmation(
      "https://project.example/",
      "public-anon-fixture",
      request,
    );
    const [url, init] = request.mock.calls[0];
    expect(url).toBe("https://project.example/auth/v1/settings");
    expect(init?.body).toBeUndefined();
    expect(init?.cache).toBe("no-store");
  });
  it.each([true, undefined, null, "false", 0])(
    "rejects autoconfirm or unknown setting %s",
    async (value) => {
      const request = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ mailer_autoconfirm: value })),
        );
      await expect(
        requireSignupConfirmation("https://project.example", "public", request),
      ).rejects.toThrow("Email confirmation required");
    },
  );
  it("fails closed on unavailable configuration", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      requireSignupConfirmation("https://project.example", "public", request),
    ).rejects.toThrow("Account settings unavailable");
  });
  it("fails closed on malformed response or transport failure", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response("not-json"));
    await expect(
      requireSignupConfirmation("https://project.example", "public", request),
    ).rejects.toThrow();
    request.mockRejectedValue(new Error("offline"));
    await expect(
      requireSignupConfirmation("https://project.example", "public", request),
    ).rejects.toThrow("offline");
  });
});
