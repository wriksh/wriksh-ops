import "server-only";
import { renderToBuffer, renderToStream } from "@react-pdf/renderer";
import React from "react";
import { buildCatalogueDocument } from "@/lib/catalogue/Document";
import { logger } from "@/lib/logger";

/**
 * Server-side render entry-point.
 *
 * Two flavours: `renderCataloguePdfBuffer` returns a Node Buffer (best for
 * route handlers that need to set headers, log size, or upload to Blob);
 * `renderCataloguePdfStream` returns a Node Readable stream (best for piping
 * directly to the response).
 *
 * Each call is wrapped in `logger.timed` so we can monitor p95 render times.
 */

export async function renderCataloguePdfBuffer(stateSlug: string): Promise<{
  buffer: Buffer;
  stateName: string;
  traditionCount: number;
  festivalCount: number;
  providerCount: number;
}> {
  return logger.timed(
    "catalogue.render.buffer",
    { stateSlug },
    async () => {
      const { doc, context } = await buildCatalogueDocument(stateSlug);
      const buffer = await renderToBuffer(doc as React.ReactElement);
      return {
        buffer,
        stateName: context.state.name,
        traditionCount: context.traditions.length,
        festivalCount: context.festivals.length,
        providerCount: context.providers.length,
      };
    }
  );
}

export async function renderCataloguePdfStream(stateSlug: string) {
  return logger.timed(
    "catalogue.render.stream",
    { stateSlug },
    async () => {
      const { doc, context } = await buildCatalogueDocument(stateSlug);
      const stream = await renderToStream(doc as React.ReactElement);
      return {
        stream,
        stateName: context.state.name,
        traditionCount: context.traditions.length,
        festivalCount: context.festivals.length,
        providerCount: context.providers.length,
      };
    }
  );
}
