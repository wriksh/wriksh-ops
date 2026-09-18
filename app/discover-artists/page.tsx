import ComingSoon from "@/components/ComingSoon";

export default function DiscoverArtistsPage() {
  return (
    <ComingSoon
      title="Discover Artists · Energy"
      phase="Phase 5"
      pillar="Energy"
      description="A verified-artist database with quotation history, ratings, and an automatic matching algorithm — score every artist against an enquiry by price, distance, and past performance. Includes a tender-tracking module for government and institutional opportunities."
      bullets={[
        "Per-artist quotation history and verification status",
        "Cosine similarity over [price, distance, past-performance]",
        "Tender ingestion from gov portals + best-match list",
        "Auto-generated 'here are the top 3 artists' emails",
      ]}
    />
  );
}
