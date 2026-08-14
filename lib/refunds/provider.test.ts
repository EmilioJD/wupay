import { describe, expect, it } from "vitest";

import { makeRefund } from "@/lib/test-support/fixtures";
import { issueWithProvider } from "@/lib/refunds/provider";

describe("issueWithProvider", () => {
  it("derives a stable reference from the refund id", async () => {
    const refund = makeRefund({ id: "0123abcd-4567-89ef-0123-456789abcdef" });

    await expect(issueWithProvider(refund)).resolves.toBe(
      "re_0123abcd456789ef",
    );
  });

  it("is deterministic for the same refund", async () => {
    const refund = makeRefund();

    const [first, second] = await Promise.all([
      issueWithProvider(refund),
      issueWithProvider(refund),
    ]);
    expect(first).toBe(second);
  });

  it("gives different refunds different references", async () => {
    const first = await issueWithProvider(makeRefund({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" }));
    const second = await issueWithProvider(makeRefund({ id: "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee" }));

    expect(first).not.toBe(second);
  });
});
