import type { RefundStatus } from "@/db/schema";

const currencyFormat = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatCents(amountCents: number): string {
  return currencyFormat.format(amountCents / 100);
}

export const refundStatusLabels: Record<RefundStatus, string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  issued: "Issued",
  rejected: "Rejected",
};

export const refundStatusVariants: Record<
  RefundStatus,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending_approval: "outline",
  approved: "secondary",
  issued: "default",
  rejected: "destructive",
};
