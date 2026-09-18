import ComingSoon from "@/components/ComingSoon";

export default function LearnHostsPage() {
  return (
    <ComingSoon
      title="Learn Hosts · TTC · CSR · Apprenticeships"
      phase="Phase 6b"
      pillar="Energy"
      description="The hosts who run the long-form learning paths — Teacher Training Courses (Athma Kalari, Shiva Yoga, Svara Mudra, Ayurveda), Corporate Social Responsibility engagements, and serious apprenticeships. The other side of the Discover → Experience → Learn loop."
      bullets={[
        "Per-host profile with art form, duration, and fee",
        "Discriminated `type`: ttc | csr | apprenticeship | workshop",
        "Connects to wriksh-dev's `learn` collection for live course pages",
        "Filters by state, art form, and budget",
      ]}
    />
  );
}
