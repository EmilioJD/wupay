# Conventions

How to build an internal tool on top of this shell.

## Where code lives

| What                                  | Where                          |
| ------------------------------------- | ------------------------------ |
| Pages for a tool                      | `app/(shell)/<tool>/page.tsx`  |
| Actions and queries for a tool        | `lib/<tool>/`                  |
| Schema (all tables)                   | `db/schema.ts`                 |
| Generated migrations (committed)      | `db/migrations/`               |
| Shared UI                             | `components/ui/`               |
| Identity                              | `lib/identity.ts`              |
| Action wrapper                        | `lib/action.ts`                |
| Navigation                            | `lib/nav.ts`                   |

Pages under `app/(shell)/` get the sidebar and header automatically.

## Roles

| Role       | For                                                              |
| ---------- | ---------------------------------------------------------------- |
| `viewer`   | Read-only access. The default when no identity cookie is present. |
| `support`  | Day-to-day operational changes on behalf of customers.            |
| `approver` | Sign-off on changes that need a second pair of eyes.              |
| `admin`    | Everything, including configuration and role management.          |

Roles are a flat set, not a hierarchy: every action lists exactly the roles that
may run it, so `admin` must be listed explicitly when it should be allowed.

## Identity

`getCurrentUser()` from `lib/identity.ts` is the only way to learn who is acting.
Never read the identity cookie or query `users` for identity anywhere else — the
real SSO integration will replace that function's body and nothing else.

```ts
import { getCurrentUser } from "@/lib/identity";

const user = await getCurrentUser(); // { id, email, name, role }
```

## Writing an action

Every operation that changes data goes through `action()`. It authorizes the
current user, runs your handler, then writes the audit event. Your handler
contains business logic only — never write to `audit_events` yourself.

```ts
// lib/payouts/actions.ts
"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { payouts } from "@/db/schema";
import { action } from "@/lib/action";

export const approvePayout = action({
  name: "payout.approve",
  resource: "payout",
  allowedRoles: ["approver", "admin"],
  resourceId: (input: { payoutId: string }) => input.payoutId,
  handler: async (input: { payoutId: string }, { user }) => {
    const [payout] = await getDb()
      .update(payouts)
      .set({ status: "approved", approvedBy: user.email })
      .where(eq(payouts.id, input.payoutId))
      .returning();
    return payout;
  },
});
```

Call it from a server component, a form action, or another server function:

```tsx
await approvePayout({ payoutId });
```

Conventions for actions:

- Name them `<resource>.<verb>` (`payout.approve`, `user.role_change`).
- Keep the input a single serializable object; it is stored as the audit
  `details`, so never put secrets or raw PII in it.
- A `ForbiddenError` is thrown when the role is not allowed. Let it propagate
  unless the page has a better way to show it.
- Reads do not need the wrapper — read access is not audited.
- No transactions and no idempotency (deliberately out of scope for now).

## Shared components (shadcn/ui)

UI primitives are [shadcn/ui](https://ui.shadcn.com) components, generated into
`components/ui/` and owned by this repo (`components.json` holds the config:
radix base, `nova` preset, neutral base colour, lucide icons).

Available today:

- `Button` — `variant`: `default`, `secondary`, `outline`, `ghost`,
  `destructive`, `link`; `size`: `default`, `xs`, `sm`, `lg`, `icon*`.
- `Badge` — statuses and roles, same `variant` names as `Button`.
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`,
  `TableCaption`, `TableFooter` — all tabular data. See `app/(shell)/audit`.
- `PageHeader` — the one non-shadcn component here (title, optional description
  and actions). One per page, at the top.

Need something else (dialog, input, dropdown-menu, …)? Generate it, don't
hand-roll it:

```bash
pnpm dlx shadcn@4.17.0 add dialog input
```

Rules of thumb:

- Style with the theme tokens (`bg-background`, `text-muted-foreground`,
  `border`, `bg-muted`), not raw palette colours like `zinc-200`. Tokens live in
  `app/globals.css`.
- Merge classes with `cn()` from `lib/utils.ts` and accept a `className` prop on
  components you write.
- Prefer editing the generated component (that is the point of shadcn) or
  composing on top of it over forking a second copy.
- Tool-specific composed components live next to the tool; shared ones go in
  `components/ui/`.
- Light mode only for now; the dark tokens exist but nothing toggles `.dark`.

## Adding a navigation link

Add one entry to `navLinks` in `lib/nav.ts`:

```ts
{ href: "/payouts", label: "Payouts" }
```

## Database changes

1. Edit `db/schema.ts`.
2. `pnpm db:generate` and commit the generated file in `db/migrations/`.
3. `pnpm db:migrate` to apply it.

`DATABASE_URL` (Neon) comes from the environment. Do not create a `.env` file in
the repo, do not print the connection string, and keep `.env.example` empty.

## Audit log

`app/(shell)/audit` reads `audit_events` generically. A new tool needs no changes
there — writing actions through the wrapper is enough.
