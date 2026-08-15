import { describe, expect, it } from "vitest";

import { roles } from "@/db/schema";
import {
  CREATE_ROLES,
  FLAG_KEY_PATTERN,
  FlagRuleError,
  SET_ROLLOUT_ROLES,
  TOGGLE_ROLES,
  canCreate,
  canSetRollout,
  canToggle,
} from "@/lib/flags/rules";

describe("FLAG_KEY_PATTERN", () => {
  it.each([
    "checkout",
    "checkout.new-ui",
    "payouts.instant",
    "a1.b2-c3",
    "v2",
  ])("accepts %o", (key) => {
    expect(FLAG_KEY_PATTERN.test(key)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["uppercase", "Checkout"],
    ["underscore", "checkout_new"],
    ["space", "checkout new"],
    ["leading dot", ".checkout"],
    ["trailing dash", "checkout-"],
    ["double dot", "checkout..new"],
    ["dot then dash", "checkout.-new"],
    ["surrounding whitespace", " checkout "],
    ["newline injection", "checkout\nDROP"],
  ])("rejects a key with %s", (_label, key) => {
    expect(FLAG_KEY_PATTERN.test(key)).toBe(false);
  });
});

describe("flag roles", () => {
  it("keeps creating and rollout changes admin-only", () => {
    expect(CREATE_ROLES).toEqual(["admin"]);
    expect(SET_ROLLOUT_ROLES).toEqual(["admin"]);
  });

  it("lets support flip a flag off in an incident", () => {
    expect(TOGGLE_ROLES).toContain("support");
  });

  it("never allows a viewer", () => {
    for (const allowed of [CREATE_ROLES, TOGGLE_ROLES, SET_ROLLOUT_ROLES]) {
      expect(allowed).not.toContain("viewer");
    }
  });

  it("matches the role predicates for every role", () => {
    for (const role of roles) {
      expect(canCreate(role)).toBe(role === "admin");
      expect(canSetRollout(role)).toBe(role === "admin");
      expect(canToggle(role)).toBe(role === "admin" || role === "support");
    }
  });
});

describe("FlagRuleError", () => {
  it("is an Error named for the rule layer", () => {
    const error = new FlagRuleError("nope");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("FlagRuleError");
    expect(error.message).toBe("nope");
  });
});
