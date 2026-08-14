import { beforeEach, describe, expect, it, vi } from "vitest";

import { roles } from "@/db/schema";
import { ForbiddenError } from "@/lib/action";
import { createFlag, setFlagRollout, toggleFlag } from "@/lib/flags/actions";
import { FLAG_RESOURCE } from "@/lib/flags/resource";
import { FlagRuleError } from "@/lib/flags/rules";
import type { CurrentUser } from "@/lib/identity";
import { FakeDb } from "@/lib/test-support/fake-db";
import { makeFlag, makeUser } from "@/lib/test-support/fixtures";

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
  currentUser = makeUser("admin");
});

describe("createFlag", () => {
  const input = {
    key: "  checkout.new-ui  ",
    description: "  New checkout UI  ",
    enabled: true,
  };

  it.each(roles.filter((role) => role !== "admin"))(
    "refuses %s before touching the database",
    async (role) => {
      currentUser = makeUser(role);

      await expect(createFlag(input)).rejects.toBeInstanceOf(ForbiddenError);
      expect(db.calls).toHaveLength(0);
    },
  );

  it.each(["Checkout", "checkout_new", "checkout new", ""])(
    "rejects the invalid key %o",
    async (key) => {
      await expect(createFlag({ ...input, key })).rejects.toThrow(FlagRuleError);
      expect(db.calls).toHaveLength(0);
    },
  );

  it("rejects a blank description", async () => {
    await expect(
      createFlag({ ...input, description: "   " }),
    ).rejects.toThrow("Enter a description for the flag.");
  });

  it("rejects a key that already exists", async () => {
    db.queue([{ id: makeFlag().id }]);

    await expect(createFlag(input)).rejects.toThrow(
      'The flag "checkout.new-ui" already exists.',
    );
    expect(db.callsOfKind("insert")).toHaveLength(0);
  });

  it("creates the flag with trimmed values and the acting admin", async () => {
    const created = makeFlag({ enabled: true });
    db.queue([], [created]);

    await expect(createFlag(input)).resolves.toEqual(created);

    const [insert] = db.callsOfKind("insert");
    expect(insert.table).toBe("feature_flags");
    expect(insert.values).toEqual({
      key: "checkout.new-ui",
      description: "New checkout UI",
      enabled: true,
      updatedBy: "admin@example.test",
    });
  });

  it("checks uniqueness against the trimmed key", async () => {
    db.queue([], [makeFlag()]);

    await createFlag(input);

    const [uniquenessCheck] = db.callsOfKind("select");
    expect(uniquenessCheck.table).toBe("feature_flags");
    expect(uniquenessCheck.where).toEqual(["checkout.new-ui"]);
    expect(uniquenessCheck.limit).toBe(1);
  });

  it("audits the creation against the new flag", async () => {
    const created = makeFlag();
    db.queue([], [created]);

    await createFlag(input);

    const audit = db.callsOfKind("insert")[1];
    expect(audit.table).toBe("audit_events");
    expect(audit.values).toEqual({
      actorEmail: "admin@example.test",
      action: "flag.create",
      resource: FLAG_RESOURCE,
      resourceId: created.id,
      details: input,
    });
  });
});

describe("toggleFlag", () => {
  const flag = makeFlag();

  it.each(["support", "admin"] as const)("lets %s toggle a flag", async (role) => {
    currentUser = makeUser(role);
    db.queue([flag], [makeFlag({ enabled: true })]);

    await toggleFlag({ flagId: flag.id, enabled: true });

    const [update] = db.callsOfKind("update");
    expect(update.table).toBe("feature_flags");
    expect(update.where).toEqual([flag.id]);
    expect(update.set).toMatchObject({
      enabled: true,
      updatedBy: `${role}@example.test`,
    });
    expect(update.set.updatedAt).toBeInstanceOf(Date);
  });

  it.each(["viewer", "approver"] as const)("refuses %s", async (role) => {
    currentUser = makeUser(role);

    await expect(
      toggleFlag({ flagId: flag.id, enabled: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(db.calls).toHaveLength(0);
  });

  it("rejects an unknown flag", async () => {
    db.queue([]);

    await expect(
      toggleFlag({ flagId: flag.id, enabled: false }),
    ).rejects.toThrow("That flag does not exist.");
    expect(db.callsOfKind("update")).toHaveLength(0);
  });

  it("turns a flag off and audits it", async () => {
    const off = makeFlag({ enabled: false });
    db.queue([makeFlag({ enabled: true })], [off]);

    await expect(
      toggleFlag({ flagId: flag.id, enabled: false }),
    ).resolves.toEqual(off);

    expect(db.callsOfKind("update")[0].set).toMatchObject({ enabled: false });
    expect(db.callsOfKind("insert")[0].values).toMatchObject({
      action: "flag.toggle",
      resource: FLAG_RESOURCE,
      resourceId: flag.id,
      details: { flagId: flag.id, enabled: false },
    });
  });
});

describe("setFlagRollout", () => {
  const flag = makeFlag();

  it.each(roles.filter((role) => role !== "admin"))(
    "refuses %s",
    async (role) => {
      currentUser = makeUser(role);

      await expect(
        setFlagRollout({ flagId: flag.id, rolloutPercentage: 50 }),
      ).rejects.toBeInstanceOf(ForbiddenError);
      expect(db.calls).toHaveLength(0);
    },
  );

  it.each([-1, 101, 12.5, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects the rollout percentage %o",
    async (rolloutPercentage) => {
      await expect(
        setFlagRollout({ flagId: flag.id, rolloutPercentage }),
      ).rejects.toThrow("Enter a whole rollout percentage from 0 to 100.");
      expect(db.calls).toHaveLength(0);
    },
  );

  it.each([0, 1, 50, 100])("accepts the boundary value %i", async (percentage) => {
    db.queue([flag], [makeFlag({ rolloutPercentage: percentage })]);

    await setFlagRollout({ flagId: flag.id, rolloutPercentage: percentage });

    expect(db.callsOfKind("update")[0].set).toMatchObject({
      rolloutPercentage: percentage,
    });
  });

  it("rejects an unknown flag", async () => {
    db.queue([]);

    await expect(
      setFlagRollout({ flagId: flag.id, rolloutPercentage: 10 }),
    ).rejects.toThrow("That flag does not exist.");
    expect(db.callsOfKind("update")).toHaveLength(0);
  });

  it("records who changed the rollout and audits it", async () => {
    db.queue([flag], [makeFlag({ rolloutPercentage: 25 })]);

    await setFlagRollout({ flagId: flag.id, rolloutPercentage: 25 });

    const [update] = db.callsOfKind("update");
    expect(update.set).toMatchObject({
      rolloutPercentage: 25,
      updatedBy: "admin@example.test",
    });
    expect(update.where).toEqual([flag.id]);
    expect(db.callsOfKind("insert")[0].values).toMatchObject({
      action: "flag.setRollout",
      resource: FLAG_RESOURCE,
      resourceId: flag.id,
    });
  });
});
