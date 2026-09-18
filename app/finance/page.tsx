import ComingSoon from "@/components/ComingSoon";

export default function FinancePage() {
  return (
    <ComingSoon
      title="Finance · Money"
      phase="Phase 4"
      pillar="Money"
      description="An Airtable-style editable grid for income and expense entries — manual form, CSV upload, and auto-categorize rules. Color-coded (green = in, red = out) with monthly roll-ups driven straight from MongoDB."
      bullets={[
        "Manual entry form with vendor, category, state, and Razorpay link",
        "CSV upload with column auto-mapping",
        "Monthly income / expense / net chart",
        "Per-vendor and per-category drill-downs",
      ]}
    />
  );
}
