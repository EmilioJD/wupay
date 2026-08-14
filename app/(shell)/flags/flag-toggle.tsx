"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { submitFlagToggle } from "@/lib/flags/form-actions";

export function FlagToggle({
  flagId,
  enabled,
}: {
  flagId: string;
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitFlagToggle, {});

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="flagId" value={flagId} />
      <input type="hidden" name="enabled" value={String(!enabled)} />
      <Button
        type="submit"
        size="sm"
        variant={enabled ? "default" : "outline"}
        disabled={pending}
      >
        {enabled ? "On" : "Off"}
      </Button>
      {state.error ? (
        <span className="text-sm text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
