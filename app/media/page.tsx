import { listMediaAssets, listBuckets } from "@/lib/collections/media";
import MediaClient from "@/components/media/MediaClient";

export default async function MediaPage() {
  const [assets, buckets] = await Promise.all([
    listMediaAssets(),
    listBuckets(),
  ]);
  return <MediaClient initialAssets={assets} buckets={buckets} />;
}
