import "server-only";
import type { ParsedInteraction, InteractionResponseBody } from "@/lib/discord/respond";
import { renderCataloguePdfBuffer } from "@/lib/catalogue/render";
import { logger } from "@/lib/logger";

/**
 * /catalogue <state> — render a PDF and post it back as an attachment.
 *
 * Discord's interaction followup endpoint supports file attachments via
 * multipart/form-data (referenced as `attachment://filename.pdf` inside
 * the embed). The actual upload happens in the route handler via
 * `followUpWithFile()`.
 */

function getOption(interaction: ParsedInteraction, name: string): string | undefined {
  const opt = interaction.options?.find((o) => o.name === name);
  return typeof opt?.value === "string" ? opt.value : undefined;
}

export async function handleCatalogue(
  interaction: ParsedInteraction
): Promise<InteractionResponseBody | { defer: true }> {
  return { defer: true };
}

export type CatalogueResult =
  | { ok: true; buffer: Buffer; filename: string; stateName: string }
  | { ok: false; reason: string };

export async function buildCatalogue(
  interaction: ParsedInteraction
): Promise<CatalogueResult> {
  const stateSlug = (getOption(interaction, "state") ?? "").toLowerCase().trim();
  if (!/^[a-z0-9-]+$/.test(stateSlug)) {
    return { ok: false, reason: "Invalid state slug." };
  }
  try {
    const { buffer, stateName } = await renderCataloguePdfBuffer(stateSlug);
    return {
      ok: true,
      buffer,
      filename: `wriksh-${stateSlug}-catalogue.pdf`,
      stateName,
    };
  } catch (err) {
    logger.error("discord.command.catalogue.fail", { stateSlug, reason: String(err) });
    return { ok: false, reason: (err as Error).message };
  }
}
