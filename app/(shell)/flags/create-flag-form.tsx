"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitFlagCreate } from "@/lib/flags/form-actions";

export function CreateFlagForm() {
  const [state, formAction, pending] = useActionState(submitFlagCreate, {});

  return (
    <form
      action={formAction}
      className="mb-6 grid gap-4 rounded-lg border bg-background p-4 sm:grid-cols-[1fr_2fr_auto_auto] sm:items-end"
    >
      <div className="grid gap-2">
        <Label htmlFor="key">Key</Label>
        <Input id="key" name="key" placeholder="checkout.new-ui" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required />
      </div>
      <div className="flex items-center gap-2 pb-2">
        <input
          id="enabled"
          name="enabled"
          type="checkbox"
          className="size-4 rounded border accent-primary"
        />
        <Label htmlFor="enabled">Enabled</Label>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create flag"}
      </Button>
      {state.error ? (
        <p className="text-sm text-destructive sm:col-span-4">{state.error}</p>
      ) : null}
    </form>
  );
}
