import { config as loadEnvironment } from "dotenv";
import { geminiConfiguration } from "../server/gemini-pool.ts";

// Configuration only: no provider request and no credential/project-ID output.
loadEnvironment({ path: ".env.local", quiet: true });
const configuration = geminiConfiguration();
console.log(
  JSON.stringify(
    {
      valid: !configuration.error,
      configuredProjects: configuration.projects.length,
      mode: configuration.projects.some((p) => p.projectId === ":legacy")
        ? "legacy-single-key"
        : configuration.projects.length
          ? "project-pool"
          : "local-checks-only",
      error: configuration.error ?? null,
      providerContacted: false,
      notice: "This checks configuration format, not key validity or available quota.",
    },
    null,
    2,
  ),
);
if (configuration.error) process.exitCode = 1;
