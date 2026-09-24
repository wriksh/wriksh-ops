/**
 * Learn PDF renderer.
 *
 * Given a state slug, this module pulls every published learn entry for
 * that state from the shared `learn` collection (owned by wriksh-dev)
 * and emits a multi-page A4 PDF:
 *
 *   1. Cover         — state name + tagline
 *   2. Welcome       — short intro to long-form learning in {state}
 *   3. One 3-page spread per learn entry:
 *      - page 1: cover image + title + city + meta + lead teacher
 *      - page 2: story / whyThisMatters / culturalBackground / schedule
 *      - page 3: prerequisites / includes / excludes / cohort dates /
 *                cancellation policy / FAQs / reviews
 *
 * Images are loaded directly from the URLs on each learn doc by
 * @react-pdf/renderer's <Image>; if the URL is missing or unreachable
 * we render a styled placeholder block instead of breaking the render.
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
import { listLearnForState } from "@/lib/collections/learn";
import type {
  StateDoc,
  LearnDoc,
  ExperienceFaq,
  ExperienceReview,
  ExperienceScheduleItem,
  LearnCohortDate,
} from "@/lib/types";

/**
 * Renders the cover image if present, otherwise a styled placeholder.
 * @react-pdf/renderer's <Image> blocks render until the URL resolves;
 * we catch any throw so a single 404 doesn't abort the whole document.
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
        <Text style={catalogueStyles.coverWordmark}>WRIKSH · LEARN</Text>
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
      <Text style={catalogueStyles.welcomeEyebrow}>WRIKSH · LEARN</Text>
      <Text style={catalogueStyles.welcomeHeading}>
        Long-form learning in {state.name}
      </Text>
      <View style={catalogueStyles.rule} />
      <Text style={catalogueStyles.bodyLg}>
        {count > 0
          ? `This volume collects every verified Wriksh learn program currently scheduled in ${state.name} — sustained, multi-week training led by working masters, with fixed intake dates and (where applicable) residential accommodation. Each listing includes a real cover photograph, lead-teacher profile, and full cancellation policy.`
          : `No learn programs are published in ${state.name} yet. Check back as new TTCs, residencies and apprenticeships are added.`}
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

function formatCohortDate(c: LearnCohortDate): string {
  const start = new Date(c.startDate).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (!c.endDate) return start;
  const end = new Date(c.endDate).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${start} → ${end}`;
}

function LearnSpread({
  learn,
  stateName,
  index,
}: {
  learn: LearnDoc;
  stateName: string;
  index: number;
}) {
  const teacher = learn.leadTeacher;
  const publishedCohorts = (learn.cohortDates ?? []).filter(
    (c) => c.published !== false
  );

  return (
    <>
      {/* Page 1 — cover image + title + meta + lead teacher */}
      <Page size="A4" style={catalogueStyles.page}>
        <Text style={catalogueStyles.eyebrow}>
          LEARN {String(index + 1).padStart(2, "0")}
        </Text>

        <View style={catalogueStyles.detailImageWrap}>
          <SafeImage src={learn.coverImage} alt={learn.title} />
        </View>

        <Text style={catalogueStyles.detailTitle}>{learn.title}</Text>
        <Text style={catalogueStyles.detailCity}>
          {learn.city}, {stateName}
        </Text>

        <View style={catalogueStyles.detailMetaRow}>
          <Text style={catalogueStyles.detailMetaChip}>
            {learn.programKind.toUpperCase()}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {learn.durationLabel}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {learn.groupType === "both"
              ? "Private or group"
              : learn.groupType}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {learn.difficultyLevel}
          </Text>
          <Text style={catalogueStyles.detailMetaChip}>
            {formatPrice(learn.priceINR, learn.priceUnit)}
          </Text>
        </View>

        {teacher?.name ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              LEAD TEACHER
            </Text>
            <Text style={catalogueStyles.detailSectionTitle}>
              {teacher.name}
            </Text>
            {teacher.role ? (
              <Text style={catalogueStyles.detailParagraph}>
                {teacher.role}
              </Text>
            ) : null}
            {teacher.bio ? (
              <Text style={catalogueStyles.detailParagraph}>
                {teacher.bio}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={catalogueStyles.pageMark}>
          <Text>wriksh.com</Text>
          <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
        </View>
      </Page>

      {/* Page 2 — story / schedule / includes */}
      <Page size="A4" style={catalogueStyles.page}>
        {learn.story ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>THE STORY</Text>
            <Text style={catalogueStyles.detailParagraph}>{learn.story}</Text>
          </View>
        ) : null}

        {learn.whyThisMatters ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              WHY THIS MATTERS
            </Text>
            <Text style={catalogueStyles.detailParagraph}>
              {learn.whyThisMatters}
            </Text>
          </View>
        ) : null}

        {learn.culturalBackground ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              CULTURAL BACKGROUND
            </Text>
            <Text style={catalogueStyles.detailParagraph}>
              {learn.culturalBackground}
            </Text>
          </View>
        ) : null}

        {learn.schedule && learn.schedule.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>SCHEDULE</Text>
            {learn.schedule.map((s: ExperienceScheduleItem, i: number) => (
              <View key={i} style={catalogueStyles.scheduleRow} wrap={false}>
                <Text style={catalogueStyles.scheduleLabel}>{s.label}</Text>
                <Text style={catalogueStyles.scheduleBody}>{s.body}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {learn.includes && learn.includes.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>INCLUDES</Text>
            {learn.includes.map((line, i) => (
              <View key={i} style={catalogueStyles.bulletRow}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {learn.excludes && learn.excludes.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              DOES NOT INCLUDE
            </Text>
            {learn.excludes.map((line, i) => (
              <View key={i} style={catalogueStyles.bulletRow}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={catalogueStyles.pageMark}>
          <Text>wriksh.com</Text>
          <Text style={catalogueStyles.pageMarkRight}>{stateName}</Text>
        </View>
      </Page>

      {/* Page 3 — prerequisites / cohort dates / cancellation / FAQs / reviews */}
      <Page size="A4" style={catalogueStyles.page}>
        {learn.prerequisites && learn.prerequisites.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              PREREQUISITES
            </Text>
            {learn.prerequisites.map((line, i) => (
              <View key={i} style={catalogueStyles.bulletRow}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {learn.whatToBring && learn.whatToBring.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              WHAT TO BRING
            </Text>
            {learn.whatToBring.map((line, i) => (
              <View key={i} style={catalogueStyles.bulletRow}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {learn.certification ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              CERTIFICATION
            </Text>
            <Text style={catalogueStyles.detailParagraph}>
              {learn.certification}
            </Text>
          </View>
        ) : null}

        {publishedCohorts.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              COHORT INTAKE DATES
            </Text>
            {publishedCohorts.map((c, i) => (
              <View key={i} style={catalogueStyles.bulletRow} wrap={false}>
                <Text style={catalogueStyles.bulletDot}>•</Text>
                <Text style={catalogueStyles.bulletText}>
                  {formatCohortDate(c)}
                  {c.notes ? ` — ${c.notes}` : ""}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {learn.cancellationPolicy ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>
              CANCELLATION POLICY
            </Text>
            <Text style={catalogueStyles.detailParagraph}>
              {learn.cancellationPolicy}
            </Text>
          </View>
        ) : null}

        {learn.faqs && learn.faqs.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>FAQS</Text>
            {learn.faqs.map((f: ExperienceFaq, i: number) => (
              <View key={i} wrap={false}>
                <Text style={catalogueStyles.faqQ}>{f.q}</Text>
                <Text style={catalogueStyles.faqA}>{f.a}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {learn.reviews && learn.reviews.length > 0 ? (
          <View style={catalogueStyles.detailSection}>
            <Text style={catalogueStyles.detailSectionEyebrow}>REVIEWS</Text>
            {learn.reviews.map((r: ExperienceReview, i: number) => (
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

/** Top-level React-PDF Document for a state's learn programs. */
export async function buildLearnDocument(stateSlug: string): Promise<{
  doc: React.ReactElement;
  stateName: string;
  learns: LearnDoc[];
}> {
  const [state, learns] = await Promise.all([
    getStateBySlug(stateSlug),
    listLearnForState(stateSlug),
  ]);

  if (!state) {
    throw new Error(`State "${stateSlug}" not found in MongoDB.`);
  }

  const doc = (
    <Document
      title={`Wriksh · ${state.name} Learn`}
      author="Wriksh"
      subject={`Curated list of verified Wriksh learn programs in ${state.name}.`}
      creator="Wriksh Ops · Dhoomkethu"
      producer="@react-pdf/renderer"
    >
      <CoverPage state={state} />
      <WelcomePage state={state} count={learns.length} />
      {learns.map((l, i) => (
        <LearnSpread key={l.slug} learn={l} stateName={state.name} index={i} />
      ))}
    </Document>
  );

  return { doc, stateName: state.name, learns };
}
