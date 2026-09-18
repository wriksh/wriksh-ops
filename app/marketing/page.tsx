import ComingSoon from "@/components/ComingSoon";

export default function MarketingPage() {
  return (
    <ComingSoon
      title="Marketing & content calendar"
      phase="Phase 2"
      pillar="Time"
      description="The chronology of Wriksh — past, present, and future posts, meetings, experiences, collabs, ads, and app-dev work, all colour-coded so the team can read a week at a glance."
      bullets={[
        "Six-category colour legend (posts / meetings / experiences / collabs / ads / app-dev)",
        "Month and agenda views with quick filters",
        "Per-event status: planned · live · done · cancelled",
        "Discord notifications wired in Phase 3",
      ]}
    />
  );
}
