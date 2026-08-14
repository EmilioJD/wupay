import type { FeatureFlag, Payment, Refund, Role } from "@/db/schema";
import type { CurrentUser } from "@/lib/identity";

export function makeUser(
  role: Role,
  overrides: Partial<CurrentUser> = {},
): CurrentUser {
  return {
    id: `11111111-1111-4111-8111-11111111111${roleDigit(role)}`,
    email: `${role}@example.test`,
    name: `${role} user`,
    role,
    ...overrides,
  };
}

function roleDigit(role: Role): number {
  return ["viewer", "support", "approver", "admin"].indexOf(role) + 1;
}

export function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "22222222-2222-4222-8222-222222222222",
    customerRef: "cus_a1",
    amountCents: 10_000,
    status: "settled",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function makeRefund(overrides: Partial<Refund> = {}): Refund {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    paymentId: "22222222-2222-4222-8222-222222222222",
    amountCents: 2_500,
    reason: "Damaged goods",
    status: "pending_approval",
    requestedBy: "support@example.test",
    approvedBy: null,
    providerRef: null,
    createdAt: new Date("2026-01-02T00:00:00Z"),
    ...overrides,
  };
}

export function makeFlag(overrides: Partial<FeatureFlag> = {}): FeatureFlag {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    key: "checkout.new-ui",
    description: "New checkout UI",
    enabled: false,
    rolloutPercentage: 0,
    updatedBy: "admin@example.test",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}
