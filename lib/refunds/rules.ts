import type { RefundStatus, Role } from "@/db/schema";

/** A refund of this size or more needs a second pair of eyes. */
export const APPROVAL_THRESHOLD_CENTS = 5_000;

/** A business rule the caller broke, safe to show in the UI. */
export class RefundRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RefundRuleError";
  }
}

export const REQUEST_ROLES: readonly Role[] = ["support", "approver", "admin"];
export const APPROVE_ROLES: readonly Role[] = ["approver", "admin"];
export const ISSUE_ROLES: readonly Role[] = ["approver", "admin"];

export function canApprove(role: Role, status: RefundStatus): boolean {
  return APPROVE_ROLES.includes(role) && status === "pending_approval";
}

export function canIssue(role: Role, status: RefundStatus): boolean {
  return ISSUE_ROLES.includes(role) && status === "approved";
}
