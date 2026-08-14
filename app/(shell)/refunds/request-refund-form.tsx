"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Payment } from "@/db/schema";
import { formatCents } from "@/lib/refunds/format";
import { submitRefundRequest } from "@/lib/refunds/form-actions";

export function RequestRefundForm({ payments }: { payments: Payment[] }) {
  const [state, formAction, pending] = useActionState(submitRefundRequest, {});

  return (
    <form
      action={formAction}
      className="mb-6 grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-[2fr_1fr_2fr_auto] sm:items-end"
    >
      <div className="grid gap-2">
        <Label htmlFor="paymentId">Payment</Label>
        <select
          id="paymentId"
          name="paymentId"
          className="h-9 rounded-lg border bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {payments.map((payment) => (
            <option key={payment.id} value={payment.id}>
              {payment.customerRef} · {formatCents(payment.amountCents)} ·{" "}
              {payment.status}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amountDollars">Amount (USD)</Label>
        <Input
          id="amountDollars"
          name="amountDollars"
          type="number"
          min="0.01"
          step="0.01"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reason">Reason</Label>
        <Input id="reason" name="reason" required />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Requesting…" : "Request refund"}
      </Button>
      {state.error ? (
        <p className="text-sm text-destructive sm:col-span-4">{state.error}</p>
      ) : null}
    </form>
  );
}
