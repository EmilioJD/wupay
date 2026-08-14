import { desc } from "drizzle-orm";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableEmpty,
} from "@/components/ui/table";
import { getDb } from "@/db";
import { auditEvents } from "@/db/schema";

const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "UTC",
});

export default async function AuditPage() {
  const events = await getDb()
    .select()
    .from(auditEvents)
    .orderBy(desc(auditEvents.occurredAt))
    .limit(100);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="The 100 most recent changes across all internal tools."
      />
      <Table>
        <THead>
          <TR>
            <TH>Timestamp (UTC)</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Resource</TH>
          </TR>
        </THead>
        <TBody>
          {events.length === 0 ? (
            <TableEmpty colSpan={4}>No audit events yet.</TableEmpty>
          ) : (
            events.map((event) => (
              <TR key={event.id}>
                <TD>{timestampFormat.format(event.occurredAt)}</TD>
                <TD>{event.actorEmail}</TD>
                <TD>
                  <Badge>{event.action}</Badge>
                </TD>
                <TD>
                  {event.resource}
                  {event.resourceId ? (
                    <span className="text-zinc-400"> · {event.resourceId}</span>
                  ) : null}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </>
  );
}
