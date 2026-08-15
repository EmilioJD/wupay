import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/lib/action";
import {
  submitRefundApproval,
  submitRefundIssue,
  submitRefundRequest,
} from "@/lib/refunds/form-actions";
import { RefundRuleError } from "@/lib/refunds/rules";
import { makeRefund } from "@/lib/test-support/fixtures";

const revalidatePath = vi.fn();
const requestRefund = vi.fn();
const approveRefund = vi.fn();
const issueRefund = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}));
vi.mock("@/lib/refunds/actions", () => ({
  requestRefund: (input: unknown) => requestRefund(input),
  approveRefund: (input: unknown) => approveRefund(input),
  issueRefund: (input: unknown) => issueRefund(input),
}));

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("submitRefundRequest", () => {
  const fields = {
    paymentId: "22222222-2222-4222-8222-222222222222",
    amountDollars: "25.00",
    reason: "Damaged goods",
  };

  it("converts dollars to whole cents", async () => {
    await expect(
      submitRefundRequest({}, formData(fields)),
    ).resolves.toEqual({});
    expect(requestRefund).toHaveBeenCalledWith({
      paymentId: fields.paymentId,
      amountCents: 2_500,
      reason: "Damaged goods",
    });
  });

  it.each([
    ["0.01", 1],
    ["25", 2_500],
    [" 12.345 ", 1_235],
    ["1234.56", 123_456],
  ])("parses %s dollars as %i cents", async (amountDollars, amountCents) => {
    await submitRefundRequest({}, formData({ ...fields, amountDollars }));

    expect(requestRefund).toHaveBeenCalledWith(
      expect.objectContaining({ amountCents }),
    );
  });

  it.each(["abc", "1,000"])(
    "reports %o as an unparseable amount",
    async (amountDollars) => {
      await expect(
        submitRefundRequest({}, formData({ ...fields, amountDollars })),
      ).resolves.toEqual({ error: "Enter a refund amount in dollars." });
      expect(requestRefund).not.toHaveBeenCalled();
    },
  );

  it.each(["", "   "])(
    "leaves an empty amount (%o) for the action to reject",
    async (amountDollars) => {
      await submitRefundRequest({}, formData({ ...fields, amountDollars }));

      expect(requestRefund).toHaveBeenCalledWith(
        expect.objectContaining({ amountCents: 0 }),
      );
    },
  );

  it("revalidates the list once the refund exists", async () => {
    await submitRefundRequest({}, formData(fields));

    expect(revalidatePath).toHaveBeenCalledWith("/refunds");
  });

  it("shows a rule error and does not revalidate", async () => {
    requestRefund.mockRejectedValue(new RefundRuleError("Payment is disputed."));

    await expect(submitRefundRequest({}, formData(fields))).resolves.toEqual({
      error: "Payment is disputed.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("turns a forbidden role into a message about the role", async () => {
    requestRefund.mockRejectedValue(
      new ForbiddenError("refund.request", "viewer"),
    );

    await expect(submitRefundRequest({}, formData(fields))).resolves.toEqual({
      error: "Your role is not allowed to run this action.",
    });
  });

  it("lets an unexpected error through as a bug", async () => {
    requestRefund.mockRejectedValue(new Error("connection lost"));

    await expect(submitRefundRequest({}, formData(fields))).rejects.toThrow(
      "connection lost",
    );
  });

  it("passes empty strings through when fields are missing", async () => {
    await submitRefundRequest({}, formData({ amountDollars: "1" }));

    expect(requestRefund).toHaveBeenCalledWith({
      paymentId: "",
      amountCents: 100,
      reason: "",
    });
  });
});

describe("submitRefundApproval", () => {
  const refundId = makeRefund().id;

  it("approves and revalidates both views", async () => {
    await expect(
      submitRefundApproval({}, formData({ refundId })),
    ).resolves.toEqual({});
    expect(approveRefund).toHaveBeenCalledWith({ refundId });
    expect(revalidatePath).toHaveBeenCalledWith("/refunds");
    expect(revalidatePath).toHaveBeenCalledWith(`/refunds/${refundId}`);
  });

  it("reports a rule error", async () => {
    approveRefund.mockRejectedValue(
      new RefundRuleError("Only a pending refund can be approved."),
    );

    await expect(
      submitRefundApproval({}, formData({ refundId })),
    ).resolves.toEqual({ error: "Only a pending refund can be approved." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reports a forbidden role", async () => {
    approveRefund.mockRejectedValue(
      new ForbiddenError("refund.approve", "support"),
    );

    await expect(
      submitRefundApproval({}, formData({ refundId })),
    ).resolves.toEqual({ error: "Your role is not allowed to run this action." });
  });
});

describe("submitRefundIssue", () => {
  const refundId = makeRefund().id;

  it("issues and revalidates both views", async () => {
    await expect(
      submitRefundIssue({}, formData({ refundId })),
    ).resolves.toEqual({});
    expect(issueRefund).toHaveBeenCalledWith({ refundId });
    expect(revalidatePath).toHaveBeenCalledWith(`/refunds/${refundId}`);
  });

  it("reports a rule error", async () => {
    issueRefund.mockRejectedValue(
      new RefundRuleError("Only an approved refund can be issued."),
    );

    await expect(
      submitRefundIssue({}, formData({ refundId })),
    ).resolves.toEqual({ error: "Only an approved refund can be issued." });
  });

  it("lets an unexpected error through as a bug", async () => {
    issueRefund.mockRejectedValue(new TypeError("boom"));

    await expect(
      submitRefundIssue({}, formData({ refundId })),
    ).rejects.toThrow(TypeError);
  });
});
