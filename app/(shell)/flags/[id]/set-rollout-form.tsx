"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFlagRollout } from "@/lib/flags/form-actions";

export function SetRolloutForm({
  flagId,
  rolloutPercentage,
}: {
  flagId: string;
  rolloutPercentage: number;
}) {
  const [state, formAction, pending] = useActionState(submitFlagRollout, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="flagId" value={flagId} />
      <div className="grid gap-2">
        <Label htmlFor="rolloutPercentage">Rollout (%)</Label>
        <Input
          id="rolloutPercentage"
          name="rolloutPercentage"
          type="number"
          className="w-28"
          defaultValue={rolloutPercentage}
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Set rollout"}
      </Button>
      {state.error ? (
        <span className="pb-2 text-sm text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
}
