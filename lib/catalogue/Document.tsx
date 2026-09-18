/**
 * Catalogue PDF renderer.
 *
 * Given a state slug, this module pulls the full data set from MongoDB
 * (state + traditions + festivals + providers + catalogue_overrides) and
 * emits a multi-page A4 PDF that mirrors the page structure of the
 * reference Karnataka catalogue HTML:
 *
 *   1. Cover                (state name + tagline)
 *   2. Welcome              (displayName + welcomeMessage from override)
 *   3. Story                (state.story paragraphs)
 *   4. Traditions in        (dance / music / theatre / craft / martial)
 *      5 sections, each    (3-col tile grid pulled from the
 *                            traditions collection)
 *   6. Festivals            (per-state festival list)
 *   7. Verified providers   (one card per provider)
 *   8. Closing / contact    (forest-green box with closing note)
 *
 * Sections can be reordered (or skipped) via the per-state
 * `catalogue_overrides` document — see DEFAULT_SECTION_ORDER.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import { catalogueStyles, pageGeometry } from "@/lib/catalogue/styles";
import { WRIKSH_BRAND } from "@/lib/brand";
import { getStateBySlug } from "@/lib/collections/states";
import { listTraditionsForState } from "@/lib/collections/traditions";
import { listProvidersForState } from "@/lib/collections/providers";
import { listFestivalsForState } from "@/lib/collections/festivals";
import {
  getCatalogueOverride,
  DEFAULT_SECTION_ORDER,
} from "@/lib/collections/catalogue";
import type {
  CatalogueSectionSlug,
  StateDoc,
  TraditionDoc,
  ProviderDoc,
  FestivalDoc,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Section helpers — small, focused components for each page.
// ---------------------------------------------------------------------------

function CoverPage({ state }: { state: StateDoc }) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <View style={catalogueStyles.coverWrap}>
        <Text style={catalogueStyles.coverWordmark}>WRIKSH · DISCOVER · BOOK</Text>
        <Text style={catalogueStyles.coverTitle}>
          {state.name}
        </Text>
        <Text style={catalogueStyles.coverSubtitle}>{state.tagline}</Text>
      </View>
      <Text style={catalogueStyles.coverFooter}>
        wriksh.com  ·  curated by the Wriksh team
      </Text>
    </Page>
  );
}

function WelcomePage({
  state,
  welcomeMessage,
}: {
  state: StateDoc;
  welcomeMessage?: string;
}) {
  const intro =
    welcomeMessage ??
    `Welcome to ${state.name}, presented by Wriksh — the portrayal of the Suvarna Yuga of Bharath. The pages that follow hold the artists, traditions, and festivals we have met and verified across this state, in the hope that you will discover something worth travelling for.`;
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.welcomeEyebrow}>A WRIKSH CATALOGUE</Text>
      <Text style={catalogueStyles.welcomeHeading}>
        Welcome to {state.name}
      </Text>
      <View style={catalogueStyles.rule} />
      <Text style={catalogueStyles.bodyLg}>{intro}</Text>

      {state.highlights?.length ? (
        <View style={{ marginTop: 18 }}>
          <Text style={catalogueStyles.eyebrow}>AT A GLANCE</Text>
          {state.highlights.map((h) => (
            <Text key={h} style={catalogueStyles.body}>
              ·  {h}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{state.name}</Text>
      </View>
    </Page>
  );
}

function StoryPage({ state }: { state: StateDoc }) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.eyebrow}>THE STATE</Text>
      <Text style={catalogueStyles.display}>{state.name}</Text>
      <View style={catalogueStyles.rule} />
      {(state.story ?? []).map((p, i) => (
        <Text
          key={i}
          style={[catalogueStyles.body, { marginBottom: 8 }]}
        >
          {p}
        </Text>
      ))}

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{state.name}</Text>
      </View>
    </Page>
  );
}

function TraditionSectionPage({
  title,
  eyebrow,
  traditions,
  stateName,
}: {
  title: string;
  eyebrow: string;
  traditions: TraditionDoc[];
  stateName: string;
}) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.eyebrow}>{eyebrow}</Text>
      <Text style={catalogueStyles.display}>{title}</Text>
      <View style={catalogueStyles.rule} />

      <View style={catalogueStyles.traditionGrid}>
        {traditions.map((t) => (
          <View key={t.slug} style={catalogueStyles.traditionTile}>
            <Text style={catalogueStyles.traditionTileKind}>{t.kind}</Text>
            <Text style={catalogueStyles.traditionTileName}>{t.name}</Text>
            <Text style={catalogueStyles.traditionTileDesc}>
              {t.description}
            </Text>
          </View>
        ))}
      </View>

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
      </View>
    </Page>
  );
}

function FestivalsPage({
  stateName,
  festivals,
}: {
  stateName: string;
  festivals: FestivalDoc[];
}) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.eyebrow}>FESTIVALS</Text>
      <Text style={catalogueStyles.display}>Celebrations & Sacred Days</Text>
      <View style={catalogueStyles.rule} />
      {festivals.map((f) => (
        <View key={f.slug} style={catalogueStyles.festivalRow}>
          <Text style={catalogueStyles.festivalMonth}>{f.month}</Text>
          <View style={catalogueStyles.festivalBody}>
            <Text style={catalogueStyles.festivalName}>{f.name}</Text>
            <Text style={catalogueStyles.festivalDesc}>{f.description}</Text>
          </View>
        </View>
      ))}

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
      </View>
    </Page>
  );
}

function ProvidersPage({
  stateName,
  providers,
}: {
  stateName: string;
  providers: ProviderDoc[];
}) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.eyebrow}>VERIFIED ARTISTS</Text>
      <Text style={catalogueStyles.display}>The Practitioners</Text>
      <View style={catalogueStyles.rule} />

      {providers.map((p) => (
        <View key={p.slug} style={catalogueStyles.providerCard} wrap={false}>
          <View style={catalogueStyles.providerHeader}>
            <Text style={catalogueStyles.providerName}>{p.name}</Text>
            <Text style={catalogueStyles.providerRole}>{p.role}</Text>
          </View>
          <Text style={catalogueStyles.providerMeta}>
            {p.experienceLabel ? `${p.experienceLabel} practice  ·  ` : ""}
            {p.craft}
          </Text>
          <Text style={catalogueStyles.providerBody}>{p.bio}</Text>
          {p.signature ? (
            <Text style={catalogueStyles.providerSignature}>
              “{p.signature}”
            </Text>
          ) : null}
          {p.verifiedNote ? (
            <Text style={catalogueStyles.providerVerified}>{p.verifiedNote}</Text>
          ) : null}
        </View>
      ))}

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
      </View>
    </Page>
  );
}

function ClosingPage({
  stateName,
  closingNote,
}: {
  stateName: string;
  closingNote?: string;
}) {
  const note =
    closingNote ??
    `Wriksh is the portrayal of the Suvarna Yuga of Bharath. To commission a performance, design an experience, or pursue long-form learning in ${stateName}, write to us at contact@wriksh.com or visit wriksh.com.`;
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.eyebrow}>A WRIKSH INVITATION</Text>
      <Text style={catalogueStyles.display}>Work with us</Text>
      <View style={catalogueStyles.rule} />

      <View style={catalogueStyles.closingBox}>
        <Text style={catalogueStyles.closingTitle}>
          {stateName}  ·  how to begin
        </Text>
        <Text style={catalogueStyles.closingBody}>{note}</Text>
      </View>

      <Text style={[catalogueStyles.body, { marginTop: 18 }]}>
        Every artist and tradition in this catalogue has been verified by the
        Wriksh team. Every photograph is used with permission. Every booking is
        honoured by the practitioners themselves.
      </Text>

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
      </View>
    </Page>
  );
}
// ---------------------------------------------------------------------------
// Section ordering: each section renders its own page(s). The order is
// configurable per-state via catalogue_overrides.sectionOrder.
// ---------------------------------------------------------------------------

const TRADITION_KINDS_BY_SECTION: Record<
  CatalogueSectionSlug,
  { kinds: string[]; title: string; eyebrow: string } | null
> = {
  welcome: null,
  story: null,
  dance: {
    kinds: ["Performing Art", "Dance"],
    title: "Dance",
    eyebrow: "MOVING FORMS",
  },
  music: {
    kinds: ["Music"],
    title: "Music",
    eyebrow: "MUSICAL TRADITIONS",
  },
  theatre: {
    kinds: ["Theatre", "Ritual Theatre", "Puppetry"],
    title: "Theatre & Puppetry",
    eyebrow: "STAGE & SHADOW",
  },
  craft: {
    kinds: ["Craft", "Visual Art", "Textile", "Painting"],
    title: "Craft & Visual Art",
    eyebrow: "HAND & EYE",
  },
  martial: {
    kinds: ["Martial Art"],
    title: "Martial Arts",
    eyebrow: "WARRIOR TRADITIONS",
  },
  festivals: null, // uses the festivals collection
  providers: null, // uses the providers collection
};

function renderSection(
  section: CatalogueSectionSlug,
  ctx: CatalogueContext
): React.ReactNode {
  const { state, traditions, festivals, providers, override } = ctx;
  switch (section) {
    case "welcome":
      return (
        <WelcomePage
          key="welcome"
          state={state}
          welcomeMessage={override?.welcomeMessage}
        />
      );
    case "story":
      return <StoryPage key="story" state={state} />;
    case "festivals":
      return (
        <FestivalsPage key="festivals" stateName={state.name} festivals={festivals} />
      );
    case "providers":
      return (
        <ProvidersPage key="providers" stateName={state.name} providers={providers} />
      );
    default: {
      const config = TRADITION_KINDS_BY_SECTION[section];
      if (!config) return null;
      const matched = traditions.filter((t) =>
        config.kinds.some((k) => t.kind?.toLowerCase().includes(k.toLowerCase()))
      );
      if (!matched.length) return null;
      return (
        <TraditionSectionPage
          key={section}
          title={config.title}
          eyebrow={config.eyebrow}
          traditions={matched}
          stateName={state.name}
        />
      );
    }
  }
}

export type CatalogueContext = {
  state: StateDoc;
  traditions: TraditionDoc[];
  festivals: FestivalDoc[];
  providers: ProviderDoc[];
  override?: Awaited<ReturnType<typeof getCatalogueOverride>>;
};

/** Top-level React-PDF Document for a given state. */
export async function buildCatalogueDocument(
  stateSlug: string
): Promise<{ doc: React.ReactElement; context: CatalogueContext }> {
  const [state, traditions, providers, festivals, override] = await Promise.all([
    getStateBySlug(stateSlug),
    listTraditionsForState(stateSlug),
    listProvidersForState(stateSlug),
    listFestivalsForState(stateSlug),
    getCatalogueOverride(stateSlug),
  ]);

  if (!state) {
    throw new Error(`State "${stateSlug}" not found in MongoDB.`);
  }

  const ctx: CatalogueContext = { state, traditions, festivals, providers, override };

  const sectionOrder =
    override?.sectionOrder && override.sectionOrder.length > 0
      ? override.sectionOrder
      : DEFAULT_SECTION_ORDER;

  const doc = (
    <Document
      title={`Wriksh · ${state.name} Catalogue`}
      author="Wriksh"
      subject={`Curated catalogue of verified artists, traditions, and festivals in ${state.name}.`}
      creator="Wriksh Ops · Dhoomkethu"
      producer="@react-pdf/renderer"
    >
      <CoverPage state={state} />
      {sectionOrder
        .filter((s) => s !== ("welcome" as CatalogueSectionSlug) || true)
        .map((s) => renderSection(s, ctx))}
    </Document>
  );

  return { doc, context: ctx };
}

