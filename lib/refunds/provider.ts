import type { Refund } from "@/db/schema";

/**
 * Stand-in for the payment provider: no network, just a short delay and a
 * deterministic reference derived from the refund id.
 */
export async function issueWithProvider(refund: Refund): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return `re_${refund.id.replaceAll("-", "").slice(0, 16)}`;
}
