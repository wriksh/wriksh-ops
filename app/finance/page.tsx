import {
  listFinanceTransactions,
  summariseFinance,
  DEFAULT_CATEGORIES,
} from "@/lib/collections/finance";
import FinanceClient from "@/components/finance/FinanceClient";

export default async function FinancePage() {
  const [txs, summary] = await Promise.all([
    listFinanceTransactions({ limit: 200 }),
    summariseFinance(),
  ]);
  return (
    <FinanceClient
      initialTransactions={txs}
      summary={summary}
      categorySuggestions={DEFAULT_CATEGORIES}
    />
  );
}
