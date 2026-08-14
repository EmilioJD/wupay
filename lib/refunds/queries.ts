import { asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { payments, refunds, type Payment, type Refund } from "@/db/schema";

export type RefundWithPayment = {
  refund: Refund;
  payment: Payment;
};

export async function listRefunds(): Promise<RefundWithPayment[]> {
  return getDb()
    .select({ refund: refunds, payment: payments })
    .from(refunds)
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .orderBy(desc(refunds.createdAt));
}

export async function listPayments(): Promise<Payment[]> {
  return getDb().select().from(payments).orderBy(asc(payments.customerRef));
}

export async function getRefund(
  refundId: string,
): Promise<RefundWithPayment | undefined> {
  const [row] = await getDb()
    .select({ refund: refunds, payment: payments })
    .from(refunds)
    .innerJoin(payments, eq(refunds.paymentId, payments.id))
    .where(eq(refunds.id, refundId))
    .limit(1);
  return row;
}
