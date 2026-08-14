"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { featureFlags, type FeatureFlag } from "@/db/schema";
import { action } from "@/lib/action";
import { FLAG_RESOURCE } from "@/lib/flags/resource";
import {
  CREATE_ROLES,
  FLAG_KEY_PATTERN,
  FlagRuleError,
  SET_ROLLOUT_ROLES,
  TOGGLE_ROLES,
} from "@/lib/flags/rules";

async function loadFlag(flagId: string): Promise<FeatureFlag> {
  const [flag] = await getDb()
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.id, flagId))
    .limit(1);
  if (!flag) {
    throw new FlagRuleError("That flag does not exist.");
  }
  return flag;
}

export type CreateFlagInput = {
  key: string;
  description: string;
  enabled: boolean;
};

export const createFlag = action({
  name: "flag.create",
  resource: FLAG_RESOURCE,
  allowedRoles: CREATE_ROLES,
  resourceId: (_input: CreateFlagInput, output: FeatureFlag) => output.id,
  handler: async (input: CreateFlagInput, { user }) => {
    const key = input.key.trim();
    if (!FLAG_KEY_PATTERN.test(key)) {
      throw new FlagRuleError(
        "Use a lowercase key with words separated by dots or dashes, such as checkout.new-ui.",
      );
    }
    const description = input.description.trim();
    if (description.length === 0) {
      throw new FlagRuleError("Enter a description for the flag.");
    }

    const [existing] = await getDb()
      .select({ id: featureFlags.id })
      .from(featureFlags)
      .where(eq(featureFlags.key, key))
      .limit(1);
    if (existing) {
      throw new FlagRuleError(`The flag "${key}" already exists.`);
    }

    const [flag] = await getDb()
      .insert(featureFlags)
      .values({
        key,
        description,
        enabled: input.enabled,
        updatedBy: user.email,
      })
      .returning();
    return flag;
  },
});

export type ToggleFlagInput = { flagId: string; enabled: boolean };

export const toggleFlag = action({
  name: "flag.toggle",
  resource: FLAG_RESOURCE,
  allowedRoles: TOGGLE_ROLES,
  resourceId: (input: ToggleFlagInput) => input.flagId,
  handler: async (input: ToggleFlagInput, { user }) => {
    const flag = await loadFlag(input.flagId);

    const [updated] = await getDb()
      .update(featureFlags)
      .set({
        enabled: input.enabled,
        updatedBy: user.email,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, flag.id))
      .returning();
    return updated;
  },
});

export type SetRolloutInput = { flagId: string; rolloutPercentage: number };

export const setFlagRollout = action({
  name: "flag.setRollout",
  resource: FLAG_RESOURCE,
  allowedRoles: SET_ROLLOUT_ROLES,
  resourceId: (input: SetRolloutInput) => input.flagId,
  handler: async (input: SetRolloutInput, { user }) => {
    const { rolloutPercentage } = input;
    if (
      !Number.isInteger(rolloutPercentage) ||
      rolloutPercentage < 0 ||
      rolloutPercentage > 100
    ) {
      throw new FlagRuleError("Enter a whole rollout percentage from 0 to 100.");
    }

    const flag = await loadFlag(input.flagId);
    const [updated] = await getDb()
      .update(featureFlags)
      .set({
        rolloutPercentage,
        updatedBy: user.email,
        updatedAt: new Date(),
      })
      .where(eq(featureFlags.id, flag.id))
      .returning();
    return updated;
  },
});
