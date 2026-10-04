// Fail closed if hosted signup would skip the requested first email check.
export async function requireSignupConfirmation(
  url: string,
  publicKey: string,
  request: typeof fetch = fetch,
) {
  const response = await request(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
    headers: { apikey: publicKey },
    signal: AbortSignal.timeout(6000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Account settings unavailable");
  const settings: unknown = await response.json();
  if (
    !settings ||
    typeof settings !== "object" ||
    !("mailer_autoconfirm" in settings) ||
    settings.mailer_autoconfirm !== false
  )
    throw new Error("Email confirmation required");
}
