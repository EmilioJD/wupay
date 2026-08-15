import { beforeEach, describe, expect, it, vi } from "vitest";

import { getFlag, listFlagHistory, listFlags } from "@/lib/flags/queries";
import { FLAG_RESOURCE } from "@/lib/flags/resource";
import { FakeDb } from "@/lib/test-support/fake-db";
import { makeFlag } from "@/lib/test-support/fixtures";

let db: FakeDb;

vi.mock("@/db", () => ({
  getDb: () => db as unknown as ReturnType<typeof import("@/db").getDb>,
}));

beforeEach(() => {
  db = new FakeDb();
});

describe("listFlags", () => {
  it("returns every flag ordered by key", async () => {
    const flags = [makeFlag()];
    db.queue(flags);

    await expect(listFlags()).resolves.toEqual(flags);

    const [select] = db.callsOfKind("select");
    expect(select.table).toBe("feature_flags");
    expect(select.ordered).toBe(true);
    expect(select.limit).toBeUndefined();
  });
});

describe("getFlag", () => {
  it("looks up a single flag by id", async () => {
    const flag = makeFlag();
    db.queue([flag]);

    await expect(getFlag(flag.id)).resolves.toEqual(flag);

    const [select] = db.callsOfKind("select");
    expect(select.where).toEqual([flag.id]);
    expect(select.limit).toBe(1);
  });

  it("resolves to undefined when nothing matches", async () => {
    await expect(getFlag(makeFlag().id)).resolves.toBeUndefined();
  });
});

describe("listFlagHistory", () => {
  it("reads a capped, newest-first slice of the flag's audit events", async () => {
    const flag = makeFlag();
    db.queue([]);

    await expect(listFlagHistory(flag.id)).resolves.toEqual([]);

    const [select] = db.callsOfKind("select");
    expect(select.table).toBe("audit_events");
    expect(select.where).toEqual([FLAG_RESOURCE, flag.id]);
    expect(select.ordered).toBe(true);
    expect(select.limit).toBe(100);
  });
});
