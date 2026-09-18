import { listLearnHosts } from "@/lib/collections/experienceGuides";
import LearnHostsClient from "@/components/hosts/LearnHostsClient";

export default async function LearnHostsPage() {
  const hosts = await listLearnHosts();
  return <LearnHostsClient initialHosts={hosts} />;
}
