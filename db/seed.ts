import "dotenv/config";

import { getDb } from "./index";
import { featureFlags, payments, users } from "./schema";

const seededUsers = [
  { email: "viewer@example.test", name: "Vera Viewer", role: "viewer" },
  { email: "support@example.test", name: "Sam Support", role: "support" },
  { email: "approver@example.test", name: "Avery Approver", role: "approver" },
  { email: "admin@example.test", name: "Adele Admin", role: "admin" },
] as const;

/** Fixed ids keep the seed idempotent; amounts sit on both sides of $50. */
const seededPayments = [
  {
    id: "3f7c1f00-0000-4000-8000-000000000001",
    customerRef: "cus_a1",
    amountCents: 1250,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000002",
    customerRef: "cus_a2",
    amountCents: 3999,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000003",
    customerRef: "cus_b7",
    amountCents: 4900,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000004",
    customerRef: "cus_c3",
    amountCents: 5000,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000005",
    customerRef: "cus_c9",
    amountCents: 7500,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000006",
    customerRef: "cus_d4",
    amountCents: 12500,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000007",
    customerRef: "cus_e8",
    amountCents: 21000,
    status: "settled",
  },
  {
    id: "3f7c1f00-0000-4000-8000-000000000008",
    customerRef: "cus_f2",
    amountCents: 6800,
    status: "disputed",
  },
] as const;

/** Fixed ids keep the seed idempotent; a mix of on, off, and partial rollouts. */
const seededFlags = [
  {
    id: "6b2d0a00-0000-4000-8000-000000000001",
    key: "refunds.bulk-issue",
    description: "Issue several approved refunds in one go.",
    enabled: true,
    rolloutPercentage: 100,
    updatedBy: "admin@example.test",
  },
  {
    id: "6b2d0a00-0000-4000-8000-000000000002",
    key: "payouts.instant",
    description: "Send payouts over the instant rail instead of nightly ACH.",
    enabled: true,
    rolloutPercentage: 25,
    updatedBy: "admin@example.test",
  },
  {
    id: "6b2d0a00-0000-4000-8000-000000000003",
    key: "checkout.new-ui",
    description: "Serve the redesigned hosted checkout page.",
    enabled: false,
    rolloutPercentage: 10,
    updatedBy: "support@example.test",
  },
  {
    id: "6b2d0a00-0000-4000-8000-000000000004",
    key: "disputes.auto-evidence",
    description: "Attach stored evidence to new disputes automatically.",
    enabled: false,
    rolloutPercentage: 0,
    updatedBy: "admin@example.test",
  },
] as const;

async function seed() {
  const db = getDb();
  for (const user of seededUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: { name: user.name, role: user.role },
      });
  }
  for (const payment of seededPayments) {
    await db
      .insert(payments)
      .values(payment)
      .onConflictDoUpdate({
        target: payments.id,
        set: {
          customerRef: payment.customerRef,
          amountCents: payment.amountCents,
          status: payment.status,
        },
      });
  }
  for (const flag of seededFlags) {
    await db
      .insert(featureFlags)
      .values(flag)
      .onConflictDoUpdate({
        target: featureFlags.id,
        set: {
          key: flag.key,
          description: flag.description,
          enabled: flag.enabled,
          rolloutPercentage: flag.rolloutPercentage,
          updatedBy: flag.updatedBy,
        },
      });
  }
  console.log(
    `Seeded ${seededUsers.length} users, ${seededPayments.length} payments, and ${seededFlags.length} feature flags.`,
  );
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
