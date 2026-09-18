/**
 * scripts/catalogue_render.ts
 *
 * Render a state catalogue PDF and write it to disk.
 *
 * Usage:
 *   npm run catalogue:render -- karnataka
 *   npm run catalogue:render -- karnataka --out ./out/karnataka.pdf
 */

import fs from "node:fs/promises";
import path from "node:path";
import { renderCataloguePdfBuffer } from "../lib/catalogue/render";
import { recordCatalogueJob } from "../lib/collections/catalogue";
import { logger } from "../lib/logger";

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error(
      "Usage: npm run catalogue:render -- <state-slug> [--out <file.pdf>]"
    );
    process.exit(1);
  }
  const stateSlug = args[0];
  const outIdx = args.indexOf("--out");
  const outFile =
    outIdx >= 0 && args[outIdx + 1]
      ? args[outIdx + 1]
      : path.join(process.cwd(), "out", `wriksh-${stateSlug}-catalogue.pdf`);

  const start = Date.now();
  const { buffer, stateName, traditionCount, festivalCount, providerCount } =
    await renderCataloguePdfBuffer(stateSlug);

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, buffer);

  const durationMs = Date.now() - start;
  await recordCatalogueJob({
    stateSlug,
    generatedBy: "scripts/catalogue_render",
    durationMs,
    byteSize: buffer.byteLength,
    notes: `traditions=${traditionCount}, festivals=${festivalCount}, providers=${providerCount}`,
  });

  console.log(
    `✓ Rendered ${stateName} (${stateSlug}) in ${durationMs}ms — ${(
      buffer.byteLength / 1024
    ).toFixed(0)} KB → ${outFile}`
  );
  logger.info("catalogue_render.done", {
    stateSlug,
    durationMs,
    byteSize: buffer.byteLength,
    outFile,
  });
}

main().catch((err) => {
  logger.error("catalogue_render.fail", { reason: String(err) });
  process.exit(1);
});
