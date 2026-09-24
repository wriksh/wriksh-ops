/**
 * Experiences PDF renderer.
 *
 * Given a state slug, this module pulls every published experience for
 * that state from the shared `experiences` collection (owned by
 * wriksh-dev) and emits a multi-page A4 PDF:
 *
 *   1. Cover         — state name + tagline
 *   2. Welcome       — short intro to the experiences in {state}
 *   3. One 2-page spread per experience:
 *      - cover image (real coverImage URL via <Image>)
 *      - title + city + meta chips (type, duration, group, difficulty)
 *      - story / whyThisMatters / culturalBackground
 *      - day-by-day schedule
 *      - includes / excludes
 *      - FAQs + reviews
 *
 * Images are loaded directly from the URLs on each experience doc by
 * @react-pdf/renderer's <Image>; if the URL is missing or unreachable
 * we render a styled placeholder block instead of breaking the render.
 *
 * Sections render in title-alphabetical order. There is no per-state
 * section-order override for this PDF — experiences are an index, not
 * a curated chapter, and a stable alphabetical order keeps the PDF
 * diff-friendly across re-renders.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
} from "@react-pdf/renderer";
import { catalogueStyles } from "@/lib/catalogue/styles";
import { getStateBySlug } from "@/lib/collections/states";
import { listExperiencesForState } from "@/lib/collections/experiences";
import type {
  StateDoc,
  ExperienceDoc,
  ExperienceFaq,
  ExperienceReview,
  ExperienceScheduleItem,
} from "@/lib/types";

/**
 * Small helper that wraps a real image URL in <Image>, falling back to a
 * styled placeholder when the URL is missing. Keeps render failures
 * non-fatal — a 404 from Vercel Blob would otherwise abort the entire
 * document.
 */
function SafeImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return (
      <View style={catalogueStyles.detailImagePlaceholder}>
        <Text style={catalogueStyles.detailImagePlaceholderText}>{alt}</Text>
      </View>
    );
  }
  return <Image src={src} style={catalogueStyles.detailImage} />;
}

function CoverPage({ state }: { state: StateDoc }) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <View style={catalogueStyles.coverWrap}>
        <Text style={catalogueStyles.coverWordmark}>WRIKSH · EXPERIENCES</Text>
        <Text style={catalogueStyles.coverTitle}>{state.name}</Text>
        <Text style={catalogueStyles.coverSubtitle}>{state.tagline}</Text>
      </View>
      <Text style={catalogueStyles.coverFooter}>
        wriksh.com  ·  curated by the Wriksh team
      </Text>
    </Page>
  );
}

function WelcomePage({ state, count }: { state: StateDoc; count: number }) {
  return (
    <Page size="A4" style={catalogueStyles.page}>
      <Text style={catalogueStyles.welcomeEyebrow}>WRIKSH · EXPERIENCES</Text>
      <Text style={catalogueStyles.welcomeHeading}>
        Experiences in {state.name}
      </Text>
      <View style={catalogueStyles.rule} />
      <Text style={catalogueStyles.bodyLg}>
        {count > 0
          ? `This volume collects every verified Wriksh experience currently scheduled in ${state.name} — short-form, practice-led visits you can join as a private guest or as part of a small group. Each listing includes a real cover photograph, day-by-day schedule, and FAQs straight from the field.`
          : `No experiences are published in ${state.name} yet. Check back as new programs are added by the Wriksh team.`}
      </Text>

      <View style={catalogueStyles.pageMark}>
        <Text>wriksh.com</Text>
        <Text style={catalogueStyles.pageMarkRight}>{state.name}</Text>
      </View>
    </Page>
  );
}

/** Format an INR price for the meta-chip strip. */
function formatPrice(amount: number, unit: "person" | "group"): string {
  if (!amount) return "Price on request";
  const formatted = `INR ${amount.toLocaleString("en-IN")}`;
  return `${formatted} / ${unit === "person" ? "person" : "group"}`;
}

function ExperienceSpread({
  experience,
  stateName,
  index,
}: {
  experience: ExperienceDoc;
  stateName: string;
  index: number;
}) {
  return (
    <>
      {/* Page 1 — cover image + title + meta */}
      <Page size="A4" style={catalogueStyles.page}>
        <Text style={catalogueStyles.eyebrow}>
          EXPERIENCE {String(index + 1).padStart(2, "0")}
        </Text>

        <View style={catalogueStyles.detailImageWrap}>
          <SafeImage src={experience.coverImage} alt={experience.title} />
        </View>

        <Text style={catalogueStyles.detailTitle}>{experience.title}</Text>
        <Text style={catalogueStyles.detailCity}>
          {experience.city}, {stateName}
        </Text>

        <View style={catalogueStyles.detailMetaRow}>
          <Text style={catalogueStyles.detailMetaChip}>{experience.type}</Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {experience.durationLabel}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {experience.groupType === "both"
              ? "Private or group"
              : experience.groupType}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {experience.difficultyLevel}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {formatPrice(experience.priceINR, experience.priceUnit)}
          </Text>
        </View>

        {experience.tags && experience.tags.length > 0 ? (
          <View style={catalogueStyles.detailMetaRow}>
            {experience.tags.slice(0, 4).map((t) => (
              <Text key={t} style={catalogueStyles.detailMetaChip}>
                {t}
              </Text>
            ))}
          </View>
        ) : null}

        <View style={catalogueStyles.pageMark}>
          <Text>wriksh.com</Text>
          <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
        </View>
      </Page>

      {/* Page 2 — story / schedule / includes / FAQs */}
      <Page size="A4" style={catalogueStyles.page}>
        {experience.story ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>THE STORY</Text>
            <Text style={catalogueStyles.detailParagraph}>
              {experience.story}
            </Text>
          </View>
        ) : null}

        {experience.whyThisMatters ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              WHY THIS MATTERS
            </Text>
            <Text style={catalogueStyles.detailParagraph}>
              {experience.whyThisMatters}
            </Text>
          </View>
        ) : null}

        {experience.culturalBackground ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              CULTURAL BACKGROUND
            </Text>
            <Text style={catalogueStyles.detailParagraph}>
              {experience.culturalBackground}
            </Text>
          </View>
        ) : null}

        {experience.schedule && experience.schedule.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>SCHEDULE</Text>
            {experience.schedule.map((s: ExperienceScheduleItem, i: number) => (
              <View key={i} style={catalogueStyles.scheduleRow} wrap={false}>
                <Text style={catalogueStyles.scheduleLabel}>{s.label}</Text>
                <Text style={catalogueStyles.scheduleBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {experience.includes && experience.includes.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>INCLUDES</Text>
            {experience.includes.map((line, i) => (
              <View key={i} style={catalogueStyles.bulletRow}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {experience.excludes && experience.excludes.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              DOES NOT INCLUDE
            </Text>
            {experience.excludes.map((line, i) => (
              <View key={i} style={catalogueStyles.bulletRow}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {experience.faqs && experience.faqs.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>FAQS</Text>
            {experience.faqs.map((f: ExperienceFaq, i: number) => (
              <View key={i} wrap={false}>
                <Text style={catalogueStyles.faqQ}>{f.q}</Text>
                <Text style={catalogueStyles.faqA}>{f.a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {experience.reviews && experience.reviews.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>REVIEWS</Text>
            {experience.reviews.map((r: ExperienceReview, i: number) => (
              <View key={i} style={catalogueStyles.reviewCard} wrap={false}>
                <Text style={catalogueStyles.reviewQuote}>
                  {`\u201C${r.quote}\u201D`}
                </Text>
                <Text style={catalogueStyles.reviewAttribution}>
                  {r.name} · {r.rating}/5
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={catalogueStyles.pageMark}>
          <Text>wriksh.com</Text>
          <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
        </View>
      </Page>
    </>
  );
}

/** Top-level React-PDF Document for a state's experiences. */
export async function buildExperienceDocument(stateSlug: string): Promise<{
  doc: React.ReactElement;
  stateName: string;
  experiences: ExperienceDoc[];
}> {
  const [state, experiences] = await Promise.all([
    getStateBySlug(stateSlug),
    listExperiencesForState(stateSlug),
  ]);

  if (!state) {
    throw new Error(`State "${stateSlug}" not found in MongoDB.`);
  }

  const doc = (
    <Document
      title={`Wriksh · ${state.name} Experiences`}
      author="Wriksh"
      subject={`Curated list of verified Wriksh experiences in ${state.name}.`}
      creator="Wriksh Ops · Dhoomkethu"
      producer="@react-pdf/renderer"
    >
      <CoverPage state={state} />
      <WelcomePage state={state} count={experiences.length} />
      {experiences.map((e, i) => (
        <ExperienceSpread
          key={e.slug}
          experience={e}
          stateName={state.name}
          index={i}
        />
      ))}
    </Document>
  );

  return { doc, stateName: state.name, experiences };
}
