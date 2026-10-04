export class EvaluationAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationAuthError";
  }
}

// Successor evaluation tooling shares the app's verified bearer contract. Call
// this before opening any selected dataset. Credentials never appear in errors,
// output, command-line flags, decoded claims or generated evaluation artifacts.
export function evaluationAuthHeaders(
  cloud: boolean,
  accessToken = process.env.SAJAG_EVAL_ACCESS_TOKEN,
): Record<string, string> {
  if (!cloud) return {};
  const token = accessToken?.trim();
  if (!token || token.length > 8192 || !/^[A-Za-z0-9._~-]+$/.test(token))
    throw new EvaluationAuthError(
      "Cloud evaluation requires a current SAJAG_EVAL_ACCESS_TOKEN. Stopped before opening any selected messages.",
    );
  return { Authorization: `Bearer ${token}` };
}

export function isEvaluationAuthFailure(
  status: number,
  body: unknown,
): boolean {
  if (status === 401 || status === 403) return true;
  if (status !== 503 || !body || typeof body !== "object") return false;
  const code = (body as { code?: unknown }).code;
  return ["AUTH_REQUIRED", "SESSION_INVALID", "AUTH_UNAVAILABLE"].includes(
    typeof code === "string" ? code : "",
  );
}

export function rejectEvaluationAuthFailure(
  status: number,
  body: unknown,
): void {
  if (isEvaluationAuthFailure(status, body))
    throw new EvaluationAuthError(
      "Sign-in was rejected or could not be checked. Evaluation stopped; no accuracy totals may be reported for this run.",
    );
}
