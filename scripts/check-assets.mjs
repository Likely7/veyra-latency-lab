import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const base = new URL("../public/signals/", import.meta.url);
try {
  const manifest = JSON.parse(
    await readFile(new URL("manifest.json", base), "utf8"),
  );
  for (const fps of [30, 60, 120])
    for (const count of [20, 50, 100]) {
      const key = `${fps}-${count}`,
        signal = manifest.signals[key];
      if (
        !signal ||
        signal.fps !== fps ||
        signal.eventCount !== count ||
        signal.events.length !== count
      )
        throw new Error(`Invalid signal manifest: ${key}`);
      const bytes = await readFile(new URL(signal.file, base));
      if (createHash("sha256").update(bytes).digest("hex") !== signal.sha256)
        throw new Error(`Signal digest mismatch: ${signal.file}`);
    }
  console.log("Signal assets: all 9 files match their manifest digests.");
} catch (error) {
  console.error(
    `${error.message}\nRegenerate assets with npm run generate:signals, then npm run verify:signals.`,
  );
  process.exitCode = 1;
}
