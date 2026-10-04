import type { ClaimAnalysis } from "../../shared/types";
// PostgreSQL's jsonb text includes separator spaces. Indented JSON is a
// conservative upper bound, so oversized checks never trigger a partial batch.
export function fitsCloudNotebook(analysis: ClaimAnalysis): boolean {
  return (
    new TextEncoder().encode(JSON.stringify(analysis, null, 1)).byteLength <=
    65536
  );
}
