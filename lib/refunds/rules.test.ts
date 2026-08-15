import { describe, expect, it } from "vitest";

import { roles, refundStatuses } from "@/db/schema";
import {
  APPROVAL_THRESHOLD_CENTS,
  APPROVE_ROLES,
  ISSUE_ROLES,
  REQUEST_ROLES,
  RefundRuleError,
  canApprove,
  canIssue,
} from "@/lib/refunds/rules";

describe("refund roles", () => {
  it("keeps viewers out of every refund operation", () => {
    for (const allowed of [REQUEST_ROLES, APPROVE_ROLES, ISSUE_ROLES]) {
      expect(allowed).not.toContain("viewer");
    }
  });

  it("lets support request but not approve or issue", () => {
    expect(REQUEST_ROLES).toContain("support");
    expect(APPROVE_ROLES).not.toContain("support");
    expect(ISSUE_ROLES).not.toContain("support");
  });
});

describe("canApprove", () => {
  it("allows approver and admin on a pending refund only", () => {
    for (const role of roles) {
      expect(canApprove(role, "pending_approval")).toBe(
        role === "approver" || role === "admin",
      );
    }
  });

  it("rejects any status other than pending_approval", () => {
    for (const status of refundStatuses) {
      expect(canApprove("admin", status)).toBe(status === "pending_approval");
    }
  });
});

describe("canIssue", () => {
  it("allows approver and admin on an approved refund only", () => {
    for (const role of roles) {
      expect(canIssue(role, "approved")).toBe(
        role === "approver" || role === "admin",
      );
    }
  });

  it("rejects any status other than approved", () => {
    for (const status of refundStatuses) {
      expect(canIssue("admin", status)).toBe(status === "approved");
    }
  });
});

describe("RefundRuleError", () => {
  it("is an Error named for the rule layer", () => {
    const error = new RefundRuleError("nope");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("RefundRuleError");
    expect(error.message).toBe("nope");
  });
});

describe("APPROVAL_THRESHOLD_CENTS", () => {
  it("is $50 in whole cents", () => {
    expect(APPROVAL_THRESHOLD_CENTS).toBe(5000);
    expect(Number.isInteger(APPROVAL_THRESHOLD_CENTS)).toBe(true);
  });
});
