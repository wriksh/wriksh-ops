/**
 * scripts/catalogue_list.ts
 *
 * Print every state in MongoDB with the count of traditions / festivals /
 * providers available for that state's catalogue. Pure read — never
 * touches the catalogue_jobs collection.
 *
 * Run:
 *   npm run catalogue:list
 */

import { listStates } from "../lib/collections/states";
import { listTraditionsForState } from "../lib/collections/traditions";
import { listProvidersForState } from "../lib/collections/providers";
import { listFestivalsForState } from "../lib/collections/festivals";
import { logger } from "../lib/logger";

async function main() {
  const states = await listStates();
  const fmt = new Intl.NumberFormat("en-IN");
  console.log(
    ["STATE", "REGION", "TRADITIONS", "PROVIDERS", "FESTIVALS"].join("\t")
  );
  let totalTraditions = 0;
  let totalProviders = 0;
  let totalFestivals = 0;
  for (const s of states) {
    const [t, p, f] = await Promise.all([
      listTraditionsForState(s.slug),
      listProvidersForState(s.slug),
      listFestivalsForState(s.slug),
    ]);
    totalTraditions += t.length;
    totalProviders += p.length;
    totalFestivals += f.length;
    console.log(
      [s.name, s.region, t.length, p.length, f.length].join("\t")
    );
  }
  console.log(
    "-----",
    `${states.length} states · ${fmt.format(totalTraditions)} traditions · ${fmt.format(totalProviders)} providers · ${fmt.format(totalFestivals)} festivals`
  );
  logger.info("catalogue_list.done", {
    states: states.length,
    traditions: totalTraditions,
    providers: totalProviders,
    festivals: totalFestivals,
  });
}

main().catch((err) => {
  logger.error("catalogue_list.fail", { reason: String(err) });
  process.exit(1);
});
