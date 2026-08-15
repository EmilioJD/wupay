import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/lib/action";
import type { CurrentUser } from "@/lib/identity";
import {
  approveRefund,
  issueRefund,
  requestRefund,
} from "@/lib/refunds/actions";
import { RefundRuleError } from "@/lib/refunds/rules";
import { FakeDb } from "@/lib/test-support/fake-db";
import { makePayment, makeRefund, makeUser } from "@/lib/test-support/fixtures";

let db: FakeDb;
let currentUser: CurrentUser;

vi.mock("@/db", () => ({
  getDb: () => db as unknown as ReturnType<typeof import("@/db").getDb>,
}));
vi.mock("@/lib/identity", () => ({
  getCurrentUser: async () => currentUser,
}));

beforeEach(() => {
  db = new FakeDb();
  currentUser = makeUser("support");
});

describe("requestRefund", () => {
  const input = {
    paymentId: makePayment().id,
    amountCents: 2_500,
    reason: "  Damaged goods  ",
  };

  it("refuses a viewer before touching the database", async () => {
    currentUser = makeUser("viewer");

    await expect(requestRefund(input)).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.calls).toHaveLength(0);
  });

  it.each([
    ["zero", 0],
    ["negative", -100],
    ["fractional cents", 12.5],
    ["not a number", Number.NaN],
  ])("rejects a %s amount", async (_label, amountCents) => {
    await expect(requestRefund({ ...input, amountCents })).rejects.toThrow(
      RefundRuleError,
    );
    expect(db.callsOfKind("insert")).toHaveLength(0);
  });

  it("rejects a blank reason", async () => {
    await expect(requestRefund({ ...input, reason: "   " })).rejects.toThrow(
      "Enter a reason for the refund.",
    );
  });

  it("rejects an unknown payment", async () => {
    db.queue([]);

    await expect(requestRefund(input)).rejects.toThrow(
      "That payment does not exist.",
    );
  });

  it("rejects a disputed payment", async () => {
    db.queue([makePayment({ status: "disputed" })]);

    await expect(requestRefund(input)).rejects.toThrow(
      "This payment is disputed, so it cannot be refunded here.",
    );
    expect(db.callsOfKind("insert")).toHaveLength(0);
  });

  it("rejects an amount larger than the payment", async () => {
    db.queue([makePayment({ amountCents: 1_000 })]);

    await expect(
      requestRefund({ ...input, amountCents: 1_001 }),
    ).rejects.toThrow("The refund cannot be larger than the original payment.");
  });

  it("allows a refund for the full payment amount", async () => {
    const payment = makePayment({ amountCents: 1_000 });
    db.queue([payment], [makeRefund({ amountCents: 1_000 })]);

    await requestRefund({ ...input, amountCents: 1_000 });

    expect(db.callsOfKind("insert")[0].values).toMatchObject({
      amountCents: 1_000,
    });
  });

  it("holds a refund at the approval threshold for approval", async () => {
    db.queue([makePayment()], [makeRefund({ amountCents: 5_000 })]);

    await requestRefund({ ...input, amountCents: 5_000 });

    expect(db.callsOfKind("insert")[0].values).toMatchObject({
      status: "pending_approval",
    });
  });

  it("auto-approves a refund below the threshold and trims the reason", async () => {
    const payment = makePayment();
    const created = makeRefund({ amountCents: 4_999, status: "approved" });
    db.queue([payment], [created]);

    const refund = await requestRefund({ ...input, amountCents: 4_999 });

    expect(refund).toEqual(created);
    const [insert] = db.callsOfKind("insert");
    expect(insert.table).toBe("refunds");
    expect(insert.values).toEqual({
      paymentId: payment.id,
      amountCents: 4_999,
      reason: "Damaged goods",
      status: "approved",
      requestedBy: "support@example.test",
    });
  });

  it("audits the request against the new refund", async () => {
    const created = makeRefund();
    db.queue([makePayment()], [created]);

    await requestRefund(input);

    const audit = db.callsOfKind("insert")[1];
    expect(audit.table).toBe("audit_events");
    expect(audit.values).toEqual({
      actorEmail: "support@example.test",
      action: "refund.request",
      resource: "refund",
      resourceId: created.id,
      details: input,
    });
  });
});

describe("approveRefund", () => {
  beforeEach(() => {
    currentUser = makeUser("approver");
  });

  it.each(["viewer", "support"] as const)("refuses %s", async (role) => {
    currentUser = makeUser(role);

    await expect(
      approveRefund({ refundId: makeRefund().id }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.calls).toHaveLength(0);
  });

  it("rejects an unknown refund", async () => {
    db.queue([]);

    await expect(approveRefund({ refundId: makeRefund().id })).rejects.toThrow(
      "That refund does not exist.",
    );
  });

  it.each(["approved", "issued", "rejected"] as const)(
    "rejects a refund that is already %s",
    async (status) => {
      db.queue([makeRefund({ status })]);

      await expect(
        approveRefund({ refundId: makeRefund().id }),
      ).rejects.toThrow("Only a pending refund can be approved.");
      expect(db.callsOfKind("update")).toHaveLength(0);
    },
  );

  it("refuses to let the requester approve their own refund", async () => {
    currentUser = makeUser("approver", { email: "self@example.test" });
    db.queue([makeRefund({ requestedBy: "self@example.test" })]);

    await expect(approveRefund({ refundId: makeRefund().id })).rejects.toThrow(
      "A refund cannot be approved by its requester.",
    );
    expect(db.callsOfKind("update")).toHaveLength(0);
  });

  it("approves a pending refund and audits it", async () => {
    const pending = makeRefund();
    const approved = makeRefund({
      status: "approved",
      approvedBy: "approver@example.test",
    });
    db.queue([pending], [approved]);

    await expect(approveRefund({ refundId: pending.id })).resolves.toEqual(
      approved,
    );

    const [update] = db.callsOfKind("update");
    expect(update.table).toBe("refunds");
    expect(update.set).toEqual({
      status: "approved",
      approvedBy: "approver@example.test",
    });
    expect(update.where).toEqual([pending.id]);
    expect(db.callsOfKind("insert")[0].values).toMatchObject({
      action: "refund.approve",
      resource: "refund",
      resourceId: pending.id,
    });
  });
});

describe("issueRefund", () => {
  beforeEach(() => {
    currentUser = makeUser("approver");
  });

  it.each(["viewer", "support"] as const)("refuses %s", async (role) => {
    currentUser = makeUser(role);

    await expect(
      issueRefund({ refundId: makeRefund().id }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it.each(["pending_approval", "issued", "rejected"] as const)(
    "rejects a refund that is %s",
    async (status) => {
      db.queue([makeRefund({ status })]);

      await expect(issueRefund({ refundId: makeRefund().id })).rejects.toThrow(
        "Only an approved refund can be issued.",
      );
      expect(db.callsOfKind("update")).toHaveLength(0);
    },
  );

  it("issues an approved refund with the provider reference and audits it", async () => {
    const approved = makeRefund({
      id: "0123abcd-4567-89ef-0123-456789abcdef",
      status: "approved",
    });
    const issued = makeRefund({
      ...approved,
      status: "issued",
      providerRef: "re_0123abcd456789ef",
    });
    db.queue([approved], [issued]);

    await expect(issueRefund({ refundId: approved.id })).resolves.toEqual(
      issued,
    );

    const [update] = db.callsOfKind("update");
    expect(update.set).toEqual({
      status: "issued",
      providerRef: "re_0123abcd456789ef",
    });
    expect(update.where).toEqual([approved.id]);
    expect(db.callsOfKind("insert")[0].values).toMatchObject({
      action: "refund.issue",
      resourceId: approved.id,
    });
  });
});

describe("audit details", () => {
  it("records the action input and nothing else", async () => {
    db.queue([makePayment()], [makeRefund()]);
    const input = { paymentId: makePayment().id, amountCents: 100, reason: "x" };

    await requestRefund(input);

    expect(db.callsOfKind("insert")[1].values.details).toBe(input);
  });
});
