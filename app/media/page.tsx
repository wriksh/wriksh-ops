import ComingSoon from "@/components/ComingSoon";

export default function MediaPage() {
  return (
    <ComingSoon
      title="Media Assets & Operating Docs"
      phase="Phase 7"
      pillar="Energy"
      description="Every photo, video, document, and audio file the team uses — searchable, taggable, and tied to states, events, and experiences. Backed by the same Vercel Blob store the customer-facing app uses."
      bullets={[
        "Photo / video / doc / audio asset registry",
        "Tag + bucket organisation (e.g. `marketing/site/hero`)",
        "Caption, alt text, and credit on every asset",
        "Connects to Dhoomkethu for asset usage analytics",
      ]}
    />
  );
}
