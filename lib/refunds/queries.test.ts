import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRefund, listPayments, listRefunds } from "@/lib/refunds/queries";
import { FakeDb } from "@/lib/test-support/fake-db";
import { makePayment, makeRefund } from "@/lib/test-support/fixtures";

let db: FakeDb;

vi.mock("@/db", () => ({
  getDb: () => db as unknown as ReturnType<typeof import("@/db").getDb>,
}));

beforeEach(() => {
  db = new FakeDb();
});

describe("listRefunds", () => {
  it("returns every refund with its payment, newest first", async () => {
    const row = { refund: makeRefund(), payment: makePayment() };
    db.queue([row]);

    await expect(listRefunds()).resolves.toEqual([row]);

    const [select] = db.callsOfKind("select");
    expect(select.table).toBe("refunds");
    expect(select.joins).toEqual(["payments"]);
    expect(select.ordered).toBe(true);
    expect(select.limit).toBeUndefined();
  });
});

describe("listPayments", () => {
  it("returns payments ordered for the request form", async () => {
    const payments = [makePayment()];
    db.queue(payments);

    await expect(listPayments()).resolves.toEqual(payments);

    const [select] = db.callsOfKind("select");
    expect(select.table).toBe("payments");
    expect(select.joins).toEqual([]);
    expect(select.ordered).toBe(true);
  });
});

describe("getRefund", () => {
  it("looks up a single refund by id", async () => {
    const row = { refund: makeRefund(), payment: makePayment() };
    db.queue([row]);

    await expect(getRefund(row.refund.id)).resolves.toEqual(row);

    const [select] = db.callsOfKind("select");
    expect(select.joins).toEqual(["payments"]);
    expect(select.where).toEqual([row.refund.id]);
    expect(select.limit).toBe(1);
  });

  it("resolves to undefined when nothing matches", async () => {
    await expect(getRefund(makeRefund().id)).resolves.toBeUndefined();
  });
});
