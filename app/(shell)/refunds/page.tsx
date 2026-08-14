import Link from "next/link";

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
import { getCurrentUser } from "@/lib/identity";
import {
  formatCents,
  refundStatusLabels,
  refundStatusVariants,
} from "@/lib/refunds/format";
import { listPayments, listRefunds } from "@/lib/refunds/queries";
import { REQUEST_ROLES } from "@/lib/refunds/rules";

import { RequestRefundForm } from "./request-refund-form";

export default async function RefundsPage() {
  const [user, refunds, payments] = await Promise.all([
    getCurrentUser(),
    listRefunds(),
    listPayments(),
  ]);

  return (
    <>
      <PageHeader
        title="Refunds"
        description="Request, approve, and issue refunds against settled payments."
      />

      {REQUEST_ROLES.includes(user.role) ? (
        <RequestRefundForm payments={payments} />
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          Your role ({user.role}) can view refunds but not request them.
        </p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested by</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refunds.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  No refunds yet.
                </TableCell>
              </TableRow>
            ) : (
              refunds.map(({ refund, payment }) => (
                <TableRow key={refund.id}>
                  <TableCell>
                    <Link
                      href={`/refunds/${refund.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {payment.customerRef}
                    </Link>
                  </TableCell>
                  <TableCell>{formatCents(refund.amountCents)}</TableCell>
                  <TableCell>
                    <Badge variant={refundStatusVariants[refund.status]}>
                      {refundStatusLabels[refund.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{refund.requestedBy}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
