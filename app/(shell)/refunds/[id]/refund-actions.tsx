"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import {
  submitRefundApproval,
  submitRefundIssue,
  type RefundFormState,
} from "@/lib/refunds/form-actions";

function ActionButton({
  action,
  refundId,
  label,
  pendingLabel,
  variant,
}: {
  action: (
    state: RefundFormState,
    formData: FormData,
  ) => Promise<RefundFormState>;
  refundId: string;
  label: string;
  pendingLabel: string;
  variant?: "default" | "secondary";
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="refundId" value={refundId} />
      <Button type="submit" variant={variant} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
      {state.error ? (
        <span className="text-sm text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}

export function RefundActions({
  refundId,
  showApprove,
  showIssue,
}: {
  refundId: string;
  showApprove: boolean;
  showIssue: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {showApprove ? (
        <ActionButton
          action={submitRefundApproval}
          refundId={refundId}
          label="Approve"
          pendingLabel="Approving…"
        />
      ) : null}
      {showIssue ? (
        <ActionButton
          action={submitRefundIssue}
          refundId={refundId}
          label="Issue"
          pendingLabel="Issuing…"
          variant="secondary"
        />
      ) : null}
    </div>
  );
}
