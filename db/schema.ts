import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roles = ["viewer", "support", "approver", "admin"] as const;

export type Role = (typeof roles)[number];

export const roleEnum = pgEnum("role", roles);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default("viewer"),
});

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    actorEmail: text("actor_email").notNull(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    details: jsonb("details"),
  },
  (table) => [index("audit_events_occurred_at_idx").on(table.occurredAt.desc())],
);

export const paymentStatuses = ["settled", "disputed"] as const;

export type PaymentStatus = (typeof paymentStatuses)[number];

export const paymentStatusEnum = pgEnum("payment_status", paymentStatuses);

export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  /** Opaque customer token such as "cus_a1"; never names or emails. */
  customerRef: text("customer_ref").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: paymentStatusEnum("status").notNull().default("settled"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const refundStatuses = [
  "pending_approval",
  "approved",
  "issued",
  "rejected",
] as const;

export type RefundStatus = (typeof refundStatuses)[number];

export const refundStatusEnum = pgEnum("refund_status", refundStatuses);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentId: uuid("payment_id")
      .notNull()
      .references(() => payments.id),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason").notNull(),
    status: refundStatusEnum("status").notNull().default("pending_approval"),
    requestedBy: text("requested_by").notNull(),
    approvedBy: text("approved_by"),
    providerRef: text("provider_ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("refunds_created_at_idx").on(table.createdAt.desc())],
);

export const featureFlags = pgTable(
  "feature_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lowercase, words separated by dots or dashes, e.g. "payouts.instant". */
    key: text("key").notNull().unique(),
    description: text("description").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    rolloutPercentage: integer("rollout_percentage").notNull().default(0),
    updatedBy: text("updated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("feature_flags_key_idx").on(table.key)],
);

export type User = typeof users.$inferSelect;
export type AuditEvent = typeof auditEvents.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Refund = typeof refunds.$inferSelect;
export type FeatureFlag = typeof featureFlags.$inferSelect;
