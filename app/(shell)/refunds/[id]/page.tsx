import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { getCurrentUser } from "@/lib/identity";
import {
  formatCents,
  refundStatusLabels,
  refundStatusVariants,
} from "@/lib/refunds/format";
import { getRefund } from "@/lib/refunds/queries";
import { canApprove, canIssue } from "@/lib/refunds/rules";

import { RefundActions } from "./refund-actions";

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

export default async function RefundPage({
  params,
}: PageProps<"/refunds/[id]">) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const [user, row] = await Promise.all([getCurrentUser(), getRefund(id)]);
  if (!row) {
    notFound();
  }
  const { refund, payment } = row;

  return (
    <>
      <PageHeader
        title={`Refund ${formatCents(refund.amountCents)}`}
        description={refund.reason}
        actions={
          <Badge variant={refundStatusVariants[refund.status]}>
            {refundStatusLabels[refund.status]}
          </Badge>
        }
      />

      <dl className="grid max-w-2xl grid-cols-2 gap-4 rounded-lg border bg-background p-4">
        <Field label="Payment">
          {payment.customerRef} · {formatCents(payment.amountCents)} ·{" "}
          {payment.status}
        </Field>
        <Field label="Requested">
          {timestampFormat.format(refund.createdAt)} UTC
        </Field>
        <Field label="Requested by">{refund.requestedBy}</Field>
        <Field label="Approved by">
          {refund.approvedBy ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
        <Field label="Provider reference">
          {refund.providerRef ?? (
            <span className="text-muted-foreground">—</span>
          )}
        </Field>
      </dl>

      <div className="mt-6">
        <RefundActions
          refundId={refund.id}
          showApprove={canApprove(user.role, refund.status)}
          showIssue={canIssue(user.role, refund.status)}
        />
      </div>

      <p className="mt-6 text-sm">
        <Link
          href="/refunds"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Back to refunds
        </Link>
      </p>
    </>
  );
}
