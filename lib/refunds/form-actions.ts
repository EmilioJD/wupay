"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError } from "@/lib/action";
import {
  approveRefund,
  issueRefund,
  requestRefund,
} from "@/lib/refunds/actions";
import { RefundRuleError } from "@/lib/refunds/rules";

export type RefundFormState = { error?: string };

/** Turns the errors a user can cause into text; anything else is a real bug. */
function toFormState(error: unknown): RefundFormState {
  if (error instanceof RefundRuleError) {
    return { error: error.message };
  }
  if (error instanceof ForbiddenError) {
    return { error: "Your role is not allowed to run this action." };
  }
  throw error;
}

function parseAmountCents(value: FormDataEntryValue | null): number {
  const dollars = Number(typeof value === "string" ? value.trim() : "");
  if (!Number.isFinite(dollars)) {
    throw new RefundRuleError("Enter a refund amount in dollars.");
  }
  return Math.round(dollars * 100);
}

export async function submitRefundRequest(
  _state: RefundFormState,
  formData: FormData,
): Promise<RefundFormState> {
  try {
    await requestRefund({
      paymentId: String(formData.get("paymentId") ?? ""),
      amountCents: parseAmountCents(formData.get("amountDollars")),
      reason: String(formData.get("reason") ?? ""),
    });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/refunds");
  return {};
}

export async function submitRefundApproval(
  _state: RefundFormState,
  formData: FormData,
): Promise<RefundFormState> {
  const refundId = String(formData.get("refundId") ?? "");
  try {
    await approveRefund({ refundId });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/refunds");
  revalidatePath(`/refunds/${refundId}`);
  return {};
}

export async function submitRefundIssue(
  _state: RefundFormState,
  formData: FormData,
): Promise<RefundFormState> {
  const refundId = String(formData.get("refundId") ?? "");
  try {
    await issueRefund({ refundId });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/refunds");
  revalidatePath(`/refunds/${refundId}`);
  return {};
}
