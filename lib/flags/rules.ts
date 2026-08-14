import type { Role } from "@/db/schema";

/** Lowercase words separated by dots or dashes, e.g. "checkout.new-ui". */
export const FLAG_KEY_PATTERN = /^[a-z0-9]+([.-][a-z0-9]+)*$/;

/** A business rule the caller broke, safe to show in the UI. */
export class FlagRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FlagRuleError";
  }
}

export const CREATE_ROLES: readonly Role[] = ["admin"];
export const TOGGLE_ROLES: readonly Role[] = ["support", "admin"];
export const SET_ROLLOUT_ROLES: readonly Role[] = ["admin"];

export function canToggle(role: Role): boolean {
  return TOGGLE_ROLES.includes(role);
}

export function canSetRollout(role: Role): boolean {
  return SET_ROLLOUT_ROLES.includes(role);
}

export function canCreate(role: Role): boolean {
  return CREATE_ROLES.includes(role);
}
