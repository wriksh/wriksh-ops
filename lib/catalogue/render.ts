import "server-only";
import { renderToBuffer, renderToStream } from "@react-pdf/renderer";
import React from "react";
import { buildCatalogueDocument } from "@/lib/catalogue/Document";
import { buildExperienceDocument } from "@/lib/catalogue/ExperienceDocument";
import { buildLearnDocument } from "@/lib/catalogue/LearnDocument";
import { logger } from "@/lib/logger";

/**
 * Server-side render entry-points.
 *
 * Each PDF flavour exposes the same two return shapes:
 *   - Buffer  — best for route handlers that need to set headers, log
 *               size, or upload to Blob.
 *   - Stream  — best for piping directly to the response.
 *
 * All calls are wrapped in `logger.timed` so we can monitor p95 render
 * times and alert on outliers.
 */

// ---------------------------------------------------------------------------
// State catalogue — existing flow (unchanged).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Experiences PDF — list of every published experience for the state.
// ---------------------------------------------------------------------------

export async function renderExperiencesPdfBuffer(stateSlug: string): Promise<{
  buffer: Buffer;
  stateName: string;
  experienceCount: number;
}> {
  return logger.timed(
    "catalogue.experiences.render.buffer",
    { stateSlug },
    async () => {
      const { doc, stateName, experiences } =
        await buildExperienceDocument(stateSlug);
      const buffer = await renderToBuffer(doc as React.ReactElement);
      return { buffer, stateName, experienceCount: experiences.length };
    }
  );
}

export async function renderExperiencesPdfStream(stateSlug: string) {
  return logger.timed(
    "catalogue.experiences.render.stream",
    { stateSlug },
    async () => {
      const { doc, stateName, experiences } =
        await buildExperienceDocument(stateSlug);
      const stream = await renderToStream(doc as React.ReactElement);
      return { stream, stateName, experienceCount: experiences.length };
    }
  );
}

// ---------------------------------------------------------------------------
// Learn PDF — list of every published learn program for the state.
// ---------------------------------------------------------------------------

export async function renderLearnPdfBuffer(stateSlug: string): Promise<{
  buffer: Buffer;
  stateName: string;
  learnCount: number;
}> {
  return logger.timed(
    "catalogue.learn.render.buffer",
    { stateSlug },
    async () => {
      const { doc, stateName, learns } = await buildLearnDocument(stateSlug);
      const buffer = await renderToBuffer(doc as React.ReactElement);
      return { buffer, stateName, learnCount: learns.length };
    }
  );
}

export async function renderLearnPdfStream(stateSlug: string) {
  return logger.timed(
    "catalogue.learn.render.stream",
    { stateSlug },
    async () => {
      const { doc, stateName, learns } = await buildLearnDocument(stateSlug);
      const stream = await renderToStream(doc as React.ReactElement);
      return { stream, stateName, learnCount: learns.length };
    }
  );
}

