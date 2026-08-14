import { and, asc, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import {
  auditEvents,
  featureFlags,
  type AuditEvent,
  type FeatureFlag,
} from "@/db/schema";
import { FLAG_RESOURCE } from "@/lib/flags/resource";

export async function listFlags(): Promise<FeatureFlag[]> {
  return getDb().select().from(featureFlags).orderBy(asc(featureFlags.key));
}

export async function getFlag(
  flagId: string,
): Promise<FeatureFlag | undefined> {
  const [flag] = await getDb()
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.id, flagId))
    .limit(1);
  return flag;
}

/** History for one flag, read from the audit events the wrapper already wrote. */
export async function listFlagHistory(flagId: string): Promise<AuditEvent[]> {
  return getDb()
    .select()
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.resource, FLAG_RESOURCE),
        eq(auditEvents.resourceId, flagId),
      ),
    )
    .orderBy(desc(auditEvents.occurredAt))
    .limit(100);
}
