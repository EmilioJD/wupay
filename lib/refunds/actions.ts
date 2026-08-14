"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { payments, refunds, type Payment, type Refund } from "@/db/schema";
import { action } from "@/lib/action";
import { issueWithProvider } from "@/lib/refunds/provider";
import {
  APPROVAL_THRESHOLD_CENTS,
  APPROVE_ROLES,
  ISSUE_ROLES,
  REQUEST_ROLES,
  RefundRuleError,
} from "@/lib/refunds/rules";

export type RequestRefundInput = {
  paymentId: string;
  amountCents: number;
  reason: string;
};

async function loadPayment(paymentId: string): Promise<Payment> {
  const [payment] = await getDb()
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!payment) {
    throw new RefundRuleError("That payment does not exist.");
  }
  return payment;
}

async function loadRefund(refundId: string): Promise<Refund> {
  const [refund] = await getDb()
    .select()
    .from(refunds)
    .where(eq(refunds.id, refundId))
    .limit(1);
  if (!refund) {
    throw new RefundRuleError("That refund does not exist.");
  }
  return refund;
}

export const requestRefund = action({
  name: "refund.request",
  resource: "refund",
  allowedRoles: REQUEST_ROLES,
  resourceId: (_input: RequestRefundInput, output: Refund) => output.id,
  handler: async (input: RequestRefundInput, { user }) => {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      throw new RefundRuleError("Enter a refund amount greater than zero.");
    }
    if (input.reason.trim().length === 0) {
      throw new RefundRuleError("Enter a reason for the refund.");
    }

    const payment = await loadPayment(input.paymentId);
    if (payment.status === "disputed") {
      throw new RefundRuleError(
        "This payment is disputed, so it cannot be refunded here.",
      );
    }
    if (input.amountCents > payment.amountCents) {
      throw new RefundRuleError(
        "The refund cannot be larger than the original payment.",
      );
    }

    const [refund] = await getDb()
      .insert(refunds)
      .values({
        paymentId: payment.id,
        amountCents: input.amountCents,
        reason: input.reason.trim(),
        status:
          input.amountCents >= APPROVAL_THRESHOLD_CENTS
            ? "pending_approval"
            : "approved",
        requestedBy: user.email,
      })
      .returning();
    return refund;
  },
});

export type RefundIdInput = { refundId: string };

export const approveRefund = action({
  name: "refund.approve",
  resource: "refund",
  allowedRoles: APPROVE_ROLES,
  resourceId: (input: RefundIdInput) => input.refundId,
  handler: async (input: RefundIdInput, { user }) => {
    const refund = await loadRefund(input.refundId);
    if (refund.status !== "pending_approval") {
      throw new RefundRuleError("Only a pending refund can be approved.");
    }
    if (refund.requestedBy === user.email) {
      throw new RefundRuleError("A refund cannot be approved by its requester.");
    }

    const [approved] = await getDb()
      .update(refunds)
      .set({ status: "approved", approvedBy: user.email })
      .where(eq(refunds.id, refund.id))
      .returning();
    return approved;
  },
});

export const issueRefund = action({
  name: "refund.issue",
  resource: "refund",
  allowedRoles: ISSUE_ROLES,
  resourceId: (input: RefundIdInput) => input.refundId,
  handler: async (input: RefundIdInput) => {
    const refund = await loadRefund(input.refundId);
    if (refund.status !== "approved") {
      throw new RefundRuleError("Only an approved refund can be issued.");
    }

    const providerRef = await issueWithProvider(refund);
    const [issued] = await getDb()
      .update(refunds)
      .set({ status: "issued", providerRef })
      .where(eq(refunds.id, refund.id))
      .returning();
    return issued;
  },
});
