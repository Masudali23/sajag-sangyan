import { createHmac, randomBytes } from "node:crypto";

export type GeminiProject = { projectId: string; key: string };
export type GeminiConfiguration = { projects: GeminiProject[]; error?: string };
const slotName = /^GEMINI_(?:API_KEY|PROJECT_ID)_(\d+)$/;
// Opaque provider credential: do not assume an old prefix/alphabet. HTTP header
// safety still requires non-whitespace printable ASCII and a bounded length.
const validKey = (key: string) => /^[\x21-\x7e]{1,512}$/.test(key);
export function hasGeminiConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
) {
  // Numbered-only production configuration still selects the Gemini boundary,
  // where it fails closed instead of silently falling through to another vendor.
  return (
    Boolean(environment.GEMINI_API_KEY) ||
    Object.entries(environment).some(
      ([name, value]) => slotName.test(name) && Boolean(value),
    )
  );
}
export function geminiConfiguration(
  environment: NodeJS.ProcessEnv = process.env,
): GeminiConfiguration {
  const fail = (error: string): GeminiConfiguration => ({
    projects: [],
    error,
  });
  const numbered = Object.entries(environment).filter(
    ([name, value]) => slotName.test(name) && Boolean(value),
  );
  const production =
    environment.VERCEL === "1" || environment.NODE_ENV === "production";
  if (production && !environment.GEMINI_API_KEY && numbered.length)
    return fail(
      "Production Gemini requires GEMINI_API_KEY; numbered project slots are for local evaluation only.",
    );
  // Production ignores every numbered slot, including malformed/partial slots.
  // The one legacy credential retains the existing bounded model retry policy.
  if (production || !numbered.length) {
    const key = environment.GEMINI_API_KEY;
    if (key && !validKey(key))
      return fail(
        "Gemini keys must be bounded printable ASCII without whitespace or control characters.",
      );
    return { projects: key ? [{ projectId: ":legacy", key }] : [] };
  }
  if (numbered.some(([name]) => !/^[1-9]$/.test(name.match(slotName)![1])))
    return fail("Gemini configuration supports slots 1–9 only.");
  const projects: GeminiProject[] = [];
  for (let i = 1; i <= 9; i++) {
    const key = environment[`GEMINI_API_KEY_${i}`];
    const projectId = environment[`GEMINI_PROJECT_ID_${i}`]?.trim();
    if (!key && !projectId) continue;
    if (!key || !projectId)
      return fail(
        "Each enabled Gemini slot needs its key and actual Google project identifier.",
      );
    if (
      !(
        /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(projectId) ||
        (/^[1-9]\d{0,18}$/.test(projectId) &&
          BigInt(projectId) <= 9223372036854775807n)
      ) ||
      !validKey(key)
    )
      return fail(
        "A Gemini project identifier or key format is invalid. Use a bare project number or textual project ID.",
      );
    if (
      projects.length &&
      /^\d+$/.test(projects[0].projectId) !== /^\d+$/.test(projectId)
    )
      return fail(
        "Use the same identifier format for every Gemini project: all bare project numbers or all textual project IDs.",
      );
    if (projects.some((p) => p.projectId === projectId))
      return fail(
        "Duplicate Gemini project identifiers are not separate quota allocations.",
      );
    if (projects.some((p) => p.key === key))
      return fail("Duplicate Gemini keys cannot represent separate projects.");
    projects.push({ projectId, key });
  }
  return { projects };
}

export type Cooldowns = Map<string, number>;
export type GeminiProjectState = GeminiProject & {
  quota: Cooldowns;
  authentication: Cooldowns;
};
/** Instance-only memory, never provider-global accounting. Raw keys are only held in
 * request configuration; state stores a salted fingerprint for credential recovery. */
export function createGeminiPool() {
  const salt = randomBytes(32);
  const states = new Map<
    string,
    { quota: Cooldowns; fingerprint: string; authentication: Cooldowns }
  >();
  let cursor = 0;
  return {
    configuration() {
      const config = geminiConfiguration();
      const projects = config.projects.map((project): GeminiProjectState => {
        const fingerprint = createHmac("sha256", salt)
          .update(project.key)
          .digest("hex");
        let state = states.get(project.projectId);
        if (!state) {
          state = { quota: new Map(), fingerprint, authentication: new Map() };
          states.set(project.projectId, state);
        } else if (state.fingerprint !== fingerprint) {
          // Quota belongs to the project and survives key replacement. An old
          // in-flight auth failure must not block the replacement credential.
          state = {
            quota: state.quota,
            fingerprint,
            authentication: new Map(),
          };
          states.set(project.projectId, state);
        }
        return {
          ...project,
          quota: state.quota,
          authentication: state.authentication,
        };
      });
      return { projects, error: config.error };
    },
    rotate(projects: GeminiProjectState[]) {
      if (!projects.length) return [];
      const start = cursor++ % projects.length;
      return [...projects.slice(start), ...projects.slice(0, start)];
    },
  };
}
export type GeminiPool = ReturnType<typeof createGeminiPool>;
