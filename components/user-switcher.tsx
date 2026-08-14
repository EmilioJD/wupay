"use client";

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
      <label htmlFor="identity-email" className="text-xs text-zinc-500">
        Acting as
      </label>
      <select
        id="identity-email"
        name="email"
        defaultValue={currentEmail}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-8 rounded-md border border-zinc-300 bg-white px-2 text-sm text-zinc-800"
      >
        {users.map((user) => (
          <option key={user.email} value={user.email}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
      <noscript>
        <button
          type="submit"
          className="h-8 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
        >
          Switch
        </button>
      </noscript>
    </form>
  );
}
