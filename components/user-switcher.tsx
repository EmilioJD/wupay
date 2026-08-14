"use client";

import { Button } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/identity";

/**
 * Development stand-in for SSO: switches between the seeded users by asking the
 * route handler to set the identity cookie.
 */
export function UserSwitcher({
  users,
  currentEmail,
}: {
  users: CurrentUser[];
  currentEmail: string;
}) {
  return (
    <form method="post" action="/api/identity/switch" className="flex items-center gap-2">
      <label htmlFor="identity-email" className="text-xs text-muted-foreground">
        Acting as
      </label>
      <select
        id="identity-email"
        name="email"
        defaultValue={currentEmail}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-lg border bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {users.map((user) => (
          <option key={user.email} value={user.email}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
      <noscript>
        <Button type="submit">Switch</Button>
      </noscript>
    </form>
  );
}
