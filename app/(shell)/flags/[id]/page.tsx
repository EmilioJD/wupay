import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFlag, listFlagHistory } from "@/lib/flags/queries";
import { canSetRollout, canToggle } from "@/lib/flags/rules";
import { getCurrentUser } from "@/lib/identity";

import { FlagToggle } from "../flag-toggle";
import { SetRolloutForm } from "./set-rollout-form";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const timestampFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

export default async function FlagPage({ params }: PageProps<"/flags/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const [user, flag] = await Promise.all([getCurrentUser(), getFlag(id)]);
  if (!flag) {
    notFound();
  }
  const history = await listFlagHistory(flag.id);

  return (
    <>
      <PageHeader
        title={flag.key}
        description={flag.description}
        actions={
          <Badge variant={flag.enabled ? "default" : "outline"}>
            {flag.enabled ? "On" : "Off"}
          </Badge>
        }
      />

      <dl className="grid max-w-2xl grid-cols-2 gap-4 rounded-lg border bg-background p-4">
        <Field label="Rollout">{flag.rolloutPercentage}%</Field>
        <Field label="Last changed by">{flag.updatedBy}</Field>
        <Field label="Created">
          {timestampFormat.format(flag.createdAt)} UTC
        </Field>
        <Field label="Updated">
          {timestampFormat.format(flag.updatedAt)} UTC
        </Field>
      </dl>

      <div className="mt-6 flex flex-wrap items-end gap-6">
        {canToggle(user.role) ? (
          <FlagToggle flagId={flag.id} enabled={flag.enabled} />
        ) : null}
        {canSetRollout(user.role) ? (
          <SetRolloutForm
            flagId={flag.id}
            rolloutPercentage={flag.rolloutPercentage}
          />
        ) : null}
        {!canToggle(user.role) && !canSetRollout(user.role) ? (
          <p className="text-sm text-muted-foreground">
            Your role ({user.role}) can view this flag but not change it.
          </p>
        ) : null}
      </div>

      <h2 className="font-heading mt-8 mb-3 text-sm font-semibold">History</h2>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp (UTC)</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No changes recorded for this flag yet.
                </TableCell>
              </TableRow>
            ) : (
              history.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    {timestampFormat.format(event.occurredAt)}
                  </TableCell>
                  <TableCell>{event.actorEmail}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{event.action}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {JSON.stringify(event.details)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="mt-6 text-sm">
        <Link
          href="/flags"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to feature flags
        </Link>
      </p>
    </>
  );
}
