/**
 * Brand stylesheet for the catalogue PDF, ported to @react-pdf's StyleSheet API.
 *
 * Every value here is taken verbatim from
 * `Catalogues/wriksh_KAR_catalogue/catalogue_KAR_Eng.html` — same palette,
 * same font choices, same page geometry. Treat that file as the source of
 * truth for any visual change.
 *
 * @react-pdf does NOT support the full CSS spec: there's no flexbox grid,
 * no `position: absolute` on the page, no web fonts loaded from Google.
 * We work around the font limitation by using the bundled PDF core fonts
 * (Times-Roman / Times-Bold / Times-Italic), which are the closest serif
 * available without a font registration call.
 */

import { StyleSheet } from "@react-pdf/renderer";
import { WRIKSH_BRAND } from "@/lib/brand";

export const pageGeometry = {
  width: 595,
  height: 842,
  marginX: 51,
  marginTop: 51,
  marginBottom: 64,
} as const;

export const catalogueFonts = {
  body: "Times-Roman",
  bold: "Times-Bold",
  italic: "Times-Italic",
  boldItalic: "Times-BoldItalic",
} as const;

const C = WRIKSH_BRAND.colors;

export const catalogueStyles = StyleSheet.create({
  page: {
    backgroundColor: C.linen,
    color: C.ink,
    paddingTop: pageGeometry.marginTop,
    paddingBottom: pageGeometry.marginBottom,
    paddingLeft: pageGeometry.marginX,
    paddingRight: pageGeometry.marginX,
    fontFamily: catalogueFonts.body,
    fontSize: 10,
    lineHeight: 1.5,
  },
  frame: {
    borderTopWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: C.stone,
  },
  coverWrap: { flexGrow: 1, alignItems: "center", justifyContent: "center", textAlign: "center" },
  coverWordmark: { fontSize: 9, letterSpacing: 4, color: C.gold, marginBottom: 18 },
  coverTitle: { fontSize: 56, color: C.ink, fontFamily: catalogueFonts.bold, lineHeight: 1.05 },
  coverTitleItalic: { fontStyle: "italic", color: C.gold },
  coverSubtitle: { fontSize: 14, color: C.inkSoft, marginTop: 18, lineHeight: 1.4, maxWidth: 360 },
  coverFooter: {
    position: "absolute", bottom: 30, left: 0, right: 0,
    textAlign: "center", fontSize: 8, letterSpacing: 2, color: C.umber,
  },
  pageMark: {
    position: "absolute", bottom: 24, left: 51, right: 51,
    flexDirection: "row", justifyContent: "space-between",
    fontSize: 8, letterSpacing: 2, color: C.umber,
  },
  pageMarkRight: { color: C.gold },
  eyebrow: { fontSize: 8, letterSpacing: 3, color: C.gold, marginBottom: 8 },
  display: {
    fontSize: 28, color: C.ink, fontFamily: catalogueFonts.bold, marginBottom: 10, lineHeight: 1.15,
  },
  displaySm: {
    fontSize: 18, color: C.ink, fontFamily: catalogueFonts.bold, marginBottom: 6,
  },
  italic: { fontStyle: "italic", color: C.gold },
  rule: { borderBottomWidth: 0.5, borderBottomColor: C.stone, marginVertical: 10 },
  body: { color: C.inkSoft, fontSize: 10, lineHeight: 1.55 },
  bodyLg: { fontSize: 12, lineHeight: 1.55, color: C.ink },
  lead: {
    fontSize: 11, lineHeight: 1.55, color: C.ink,
    fontFamily: catalogueFonts.italic, marginBottom: 10,
  },
  welcomeEyebrow: { fontSize: 8, letterSpacing: 3, color: C.gold, marginBottom: 12 },
  welcomeHeading: {
    fontSize: 32, fontFamily: catalogueFonts.bold, color: C.ink, marginBottom: 14, lineHeight: 1.1,
  },
  sectionWrap: { flexGrow: 1 },
  twoCol: { flexDirection: "row", gap: 18 },
  colLeft: { flex: 1 },
  colRight: { flex: 1 },
  traditionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  traditionTile: {
    width: "31%", backgroundColor: C.parchment, borderRadius: 4, padding: 8,
    borderWidth: 0.5, borderColor: C.stone,
  },
  traditionTileName: {
    fontFamily: catalogueFonts.bold, fontSize: 11, color: C.ink, marginBottom: 2,
  },
  traditionTileKind: {
    fontSize: 7, letterSpacing: 1.5, color: C.gold,
    textTransform: "uppercase", marginBottom: 4,
  },
  traditionTileDesc: { fontSize: 8, color: C.inkSoft, lineHeight: 1.4 },
  providerCard: {
    backgroundColor: C.parchment, borderRadius: 4, padding: 14,
    borderWidth: 0.5, borderColor: C.stone, marginBottom: 10,
  },
  providerHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  providerName: { fontFamily: catalogueFonts.bold, fontSize: 14, color: C.ink },
  providerRole: {
    fontSize: 9, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase",
  },
  providerMeta: { fontSize: 8, color: C.umber, marginBottom: 6 },
  providerBody: { fontSize: 9.5, color: C.inkSoft, lineHeight: 1.45, marginBottom: 6 },
  providerSignature: {
    fontSize: 9, fontFamily: catalogueFonts.italic, color: C.ink, marginTop: 4,
  },
  providerVerified: {
    fontSize: 7.5, color: C.moss, marginTop: 4, letterSpacing: 1, textTransform: "uppercase",
  },
  festivalRow: {
    flexDirection: "row", marginBottom: 10,
    borderBottomWidth: 0.5, borderBottomColor: C.stone, paddingBottom: 6,
  },
  festivalMonth: {
    width: 70, fontFamily: catalogueFonts.bold, color: C.gold,
    fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase",
  },
  festivalBody: { flex: 1 },
  festivalName: {
    fontFamily: catalogueFonts.bold, fontSize: 12, color: C.ink, marginBottom: 2,
  },
  festivalDesc: { fontSize: 9, color: C.inkSoft, lineHeight: 1.45 },
  closingBox: {
    backgroundColor: C.forest, color: C.linen, padding: 18, borderRadius: 4, marginTop: 12,
  },
  closingTitle: { fontFamily: catalogueFonts.bold, fontSize: 16, color: C.linen, marginBottom: 6 },
  closingBody: { color: C.parchment, fontSize: 9, lineHeight: 1.55 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  chip: {
    backgroundColor: C.parchment2, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
    marginRight: 4, marginBottom: 4,
    fontSize: 7.5, color: C.inkSoft, letterSpacing: 0.5,
  },

  // ---------------------------------------------------------------------
  // Per-experience / per-learn detail-page styles
  //
  // Each experience / learn entry is rendered as a 2-page spread: page 1
  // is the cover image + title + meta strip; page 2 is the body content
  // (story, schedule, includes, FAQs, …). All values still pin to the
  // Wriksh brand palette via the WRIKSH_BRAND lookup above.
  // ---------------------------------------------------------------------
  detailImageWrap: {
    backgroundColor: C.parchment2,
    borderRadius: 4,
    marginBottom: 14,
    overflow: "hidden",
  },
  detailImage: {
    width: "100%",
    height: 280,
    objectFit: "cover",
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 280,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.stone,
  },
  detailImagePlaceholderText: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: C.umber,
  },
  detailTitle: {
    fontSize: 24,
    fontFamily: catalogueFonts.bold,
    color: C.ink,
    lineHeight: 1.15,
    marginBottom: 4,
  },
  detailCity: {
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: C.gold,
    marginBottom: 8,
  },
  detailMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  detailMetaChip: {
    backgroundColor: C.parchment2,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 8,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: C.inkSoft,
  },
  detailSection: { marginTop: 12, marginBottom: 10 },
  detailSectionEyebrow: {
    fontSize: 8,
    letterSpacing: 3,
    color: C.gold,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  detailSectionTitle: {
    fontSize: 13,
    fontFamily: catalogueFonts.bold,
    color: C.ink,
    marginBottom: 4,
  },
  detailParagraph: {
    fontSize: 9.5,
    color: C.inkSoft,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletDot: {
    width: 10,
    fontSize: 9.5,
    color: C.gold,
  },
  bulletText: {
    flex: 1,
    fontSize: 9.5,
    color: C.inkSoft,
    lineHeight: 1.45,
  },
  scheduleRow: {
    flexDirection: "row",
    marginBottom: 6,
    borderBottomWidth: 0.4,
    borderBottomColor: C.stone,
    paddingBottom: 5,
  },
  scheduleLabel: {
    width: 90,
    fontSize: 8.5,
    fontFamily: catalogueFonts.bold,
    color: C.gold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  scheduleBody: { flex: 1, fontSize: 9.5, color: C.inkSoft, lineHeight: 1.45 },
  faqQ: {
    fontFamily: catalogueFonts.bold,
    fontSize: 10,
    color: C.ink,
    marginBottom: 2,
  },
  faqA: { fontSize: 9.5, color: C.inkSoft, lineHeight: 1.45, marginBottom: 6 },
  reviewCard: {
    backgroundColor: C.parchment,
    borderRadius: 4,
    padding: 8,
    borderWidth: 0.4,
    borderColor: C.stone,
    marginBottom: 6,
  },
  reviewQuote: {
    fontFamily: catalogueFonts.italic,
    fontSize: 9.5,
    color: C.ink,
    lineHeight: 1.45,
    marginBottom: 3,
  },
  reviewAttribution: {
    fontSize: 7.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: C.umber,
  },
});
