// Prints the masked text the app analyses for every message in the given development fixtures,
// keyed "fixture#id", so scripts/pattern-model-train.py trains on exactly what devices score.
import { readFileSync } from "node:fs";
import { redactSensitive } from "../shared/engine.ts";

const masked: Record<string, string> = {};
for (const fixture of process.argv.slice(2)) {
  const data = JSON.parse(readFileSync(`tests/fixtures/${fixture}`, "utf8"));
  const items: { id?: unknown; text?: unknown }[] = Array.isArray(data)
    ? data
    : (data.items ?? data.cases ?? Object.values(data).find(Array.isArray));
  items.forEach((item, index) => {
    if (typeof item.text === "string")
      masked[`${fixture}#${String(item.id ?? index)}`] = redactSensitive(
        item.text,
      );
  });
}
process.stdout.write(JSON.stringify(masked));
