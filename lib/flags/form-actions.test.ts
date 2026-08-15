import { beforeEach, describe, expect, it, vi } from "vitest";

import { ForbiddenError } from "@/lib/action";
import {
  submitFlagCreate,
  submitFlagRollout,
  submitFlagToggle,
} from "@/lib/flags/form-actions";
import { FlagRuleError } from "@/lib/flags/rules";
import { makeFlag } from "@/lib/test-support/fixtures";

const revalidatePath = vi.fn();
const createFlag = vi.fn();
const toggleFlag = vi.fn();
const setFlagRollout = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => revalidatePath(path),
}));
vi.mock("@/lib/flags/actions", () => ({
  createFlag: (input: unknown) => createFlag(input),
  toggleFlag: (input: unknown) => toggleFlag(input),
  setFlagRollout: (input: unknown) => setFlagRollout(input),
}));

function formData(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

const flagId = makeFlag().id;

beforeEach(() => {
  vi.resetAllMocks();
});

describe("submitFlagCreate", () => {
  const fields = { key: "checkout.new-ui", description: "New checkout UI" };

  it("reads an unchecked checkbox as disabled", async () => {
    await expect(submitFlagCreate({}, formData(fields))).resolves.toEqual({});

    expect(createFlag).toHaveBeenCalledWith({ ...fields, enabled: false });
    expect(revalidatePath).toHaveBeenCalledWith("/flags");
  });

  it('reads the checkbox "on" value as enabled', async () => {
    await submitFlagCreate({}, formData({ ...fields, enabled: "on" }));

    expect(createFlag).toHaveBeenCalledWith({ ...fields, enabled: true });
  });

  it.each(["true", "1", "yes"])(
    "treats the unexpected checkbox value %o as disabled",
    async (enabled) => {
      await submitFlagCreate({}, formData({ ...fields, enabled }));

      expect(createFlag).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: false }),
      );
    },
  );

  it("passes empty strings through when fields are missing", async () => {
    await submitFlagCreate({}, formData({}));

    expect(createFlag).toHaveBeenCalledWith({
      key: "",
      description: "",
      enabled: false,
    });
  });

  it("shows a rule error and does not revalidate", async () => {
    createFlag.mockRejectedValue(new FlagRuleError("Key already exists."));

    await expect(submitFlagCreate({}, formData(fields))).resolves.toEqual({
      error: "Key already exists.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("turns a forbidden role into a message about the role", async () => {
    createFlag.mockRejectedValue(new ForbiddenError("flag.create", "support"));

    await expect(submitFlagCreate({}, formData(fields))).resolves.toEqual({
      error: "Your role is not allowed to run this action.",
    });
  });

  it("lets an unexpected error through as a bug", async () => {
    createFlag.mockRejectedValue(new Error("connection lost"));

    await expect(submitFlagCreate({}, formData(fields))).rejects.toThrow(
      "connection lost",
    );
  });
});

describe("submitFlagToggle", () => {
  it.each([
    ["true", true],
    ["false", false],
  ])("sends the %o hidden field as %o", async (value, enabled) => {
    await submitFlagToggle({}, formData({ flagId, enabled: value }));

    expect(toggleFlag).toHaveBeenCalledWith({ flagId, enabled });
  });

  it("revalidates both the list and the detail page", async () => {
    await submitFlagToggle({}, formData({ flagId, enabled: "true" }));

    expect(revalidatePath).toHaveBeenCalledWith("/flags");
    expect(revalidatePath).toHaveBeenCalledWith(`/flags/${flagId}`);
  });

  it("reports a forbidden role without revalidating", async () => {
    toggleFlag.mockRejectedValue(new ForbiddenError("flag.toggle", "viewer"));

    await expect(
      submitFlagToggle({}, formData({ flagId, enabled: "true" })),
    ).resolves.toEqual({ error: "Your role is not allowed to run this action." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("submitFlagRollout", () => {
  it.each([
    ["0", 0],
    ["100", 100],
    [" 25 ", 25],
  ])("parses %o as %i", async (value, rolloutPercentage) => {
    await submitFlagRollout({}, formData({ flagId, rolloutPercentage: value }));

    expect(setFlagRollout).toHaveBeenCalledWith({ flagId, rolloutPercentage });
  });

  it.each(["", "   "])(
    "sends NaN for the empty value %o so the action rejects it",
    async (value) => {
      await submitFlagRollout(
        {},
        formData({ flagId, rolloutPercentage: value }),
      );

      const [[input]] = setFlagRollout.mock.calls;
      expect(Number.isNaN((input as { rolloutPercentage: number }).rolloutPercentage)).toBe(true);
    },
  );

  it("revalidates both views on success", async () => {
    await submitFlagRollout({}, formData({ flagId, rolloutPercentage: "10" }));

    expect(revalidatePath).toHaveBeenCalledWith("/flags");
    expect(revalidatePath).toHaveBeenCalledWith(`/flags/${flagId}`);
  });

  it("shows the rule error for an out-of-range percentage", async () => {
    setFlagRollout.mockRejectedValue(
      new FlagRuleError("Enter a whole rollout percentage from 0 to 100."),
    );

    await expect(
      submitFlagRollout({}, formData({ flagId, rolloutPercentage: "150" })),
    ).resolves.toEqual({
      error: "Enter a whole rollout percentage from 0 to 100.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("lets an unexpected error through as a bug", async () => {
    setFlagRollout.mockRejectedValue(new TypeError("boom"));

    await expect(
      submitFlagRollout({}, formData({ flagId, rolloutPercentage: "10" })),
    ).rejects.toThrow(TypeError);
  });
});
