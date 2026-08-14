"use server";

import { revalidatePath } from "next/cache";

import { ForbiddenError } from "@/lib/action";
import { createFlag, setFlagRollout, toggleFlag } from "@/lib/flags/actions";
import { FlagRuleError } from "@/lib/flags/rules";

export type FlagFormState = { error?: string };

/** Turns the errors a user can cause into text; anything else is a real bug. */
function toFormState(error: unknown): FlagFormState {
  if (error instanceof FlagRuleError) {
    return { error: error.message };
  }
  if (error instanceof ForbiddenError) {
    return { error: "Your role is not allowed to run this action." };
  }
  throw error;
}

export async function submitFlagCreate(
  _state: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  try {
    await createFlag({
      key: String(formData.get("key") ?? ""),
      description: String(formData.get("description") ?? ""),
      enabled: formData.get("enabled") === "on",
    });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/flags");
  return {};
}

export async function submitFlagToggle(
  _state: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const flagId = String(formData.get("flagId") ?? "");
  try {
    await toggleFlag({ flagId, enabled: formData.get("enabled") === "true" });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/flags");
  revalidatePath(`/flags/${flagId}`);
  return {};
}

export async function submitFlagRollout(
  _state: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const flagId = String(formData.get("flagId") ?? "");
  const raw = String(formData.get("rolloutPercentage") ?? "").trim();
  try {
    await setFlagRollout({
      flagId,
      rolloutPercentage: raw === "" ? Number.NaN : Number(raw),
    });
  } catch (error) {
    return toFormState(error);
  }

  revalidatePath("/flags");
  revalidatePath(`/flags/${flagId}`);
  return {};
}
