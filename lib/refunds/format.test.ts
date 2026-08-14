import { describe, expect, it } from "vitest";

import { refundStatuses } from "@/db/schema";
import {
  formatCents,
  refundStatusLabels,
  refundStatusVariants,
} from "@/lib/refunds/format";

describe("formatCents", () => {
  it("renders cents as US dollars", () => {
    expect(formatCents(0)).toBe("$0.00");
    expect(formatCents(1)).toBe("$0.01");
    expect(formatCents(2_500)).toBe("$25.00");
    expect(formatCents(123_456)).toBe("$1,234.56");
  });

  it("keeps the sign of a negative amount", () => {
    expect(formatCents(-2_500)).toBe("-$25.00");
  });
});

describe("status presentation", () => {
  it("has a label and a badge variant for every status", () => {
    for (const status of refundStatuses) {
      expect(refundStatusLabels[status]).toBeTruthy();
      expect(refundStatusVariants[status]).toBeTruthy();
    }
  });

  it("shows a rejected refund destructively and an issued one prominently", () => {
    expect(refundStatusVariants.rejected).toBe("destructive");
    expect(refundStatusVariants.issued).toBe("default");
    expect(refundStatusLabels.pending_approval).toBe("Pending approval");
  });
});
