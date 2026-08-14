# Plan — Internal Admin Shell

A shared foundation for internal tools. Later sessions build the actual tools
on top of it. This session builds no business features and no sample tool.

## Stack

- Next.js 16, App Router, TypeScript
- Tailwind
- Neon Postgres, connected via `DATABASE_URL` (already set in the environment)
- Drizzle with the `neon-http` driver
- Deployed to Vercel with deployment protection enabled

The project is already created and connected to Neon. Do not add a local
Postgres, Docker, or a database provisioning step. Read the connection string
from `DATABASE_URL` and never print it or commit it. Keep `.env.example`
committed with an empty `DATABASE_URL=` and never create a `.env` file.

## Data model

**`users`** — id, email, name, role (`viewer`, `support`, `approver`, `admin`)

**`audit_events`** — id, occurredAt, actorEmail, action, resource, resourceId,
details (JSON)

Manage the schema with Drizzle Kit, committing generated migrations. Seed four
users, one per role, using `@example.test` addresses.

## 1. Identity

A single function returning the current user as `{ id, email, name, role }`.
It reads a cookie and looks up the seeded user, defaulting to the viewer.

A dropdown in the header switches between the four seeded users, and a small
route handler sets the cookie.

Identity enters the application only through this function, so that replacing
its body with a real OIDC lookup later requires no other changes.

## 2. Action wrapper

A helper that wraps every operation which changes data:

```
action({ name, resource, allowedRoles, handler })
```

On each call it:

1. Resolves the current user
2. Throws if their role is not in `allowedRoles`
3. Runs the handler
4. Writes an audit event recording the action name, actor email, resource,
   resource id, and the input it received

The handler contains only business logic. It never writes audit records
itself.

No transactions, no idempotency.

## 3. Audit log

A read-only page listing the 100 most recent audit events across all tools,
showing timestamp, actor, action, and resource.

It reads the table generically and requires no changes when a new tool is
added.

## 4. App shell

A sidebar layout with navigation links and a header containing the user
switcher.

Four or five shared components used by every tool: page header, table, badge,
button. Plain Tailwind, styled as an internal admin tool.

## CONVENTIONS.md

A one-page document for whoever builds the next tool, covering:

- how to write an action with the wrapper
- where feature code lives
- which shared components to use
- how to add a navigation link
- roles and what each is for

## Out of scope

Real SSO, transactions, idempotency, retention, log export, PII handling,
read-access logging, per-tool role scoping, and any business feature.

## Done when

The app builds and deploys to Vercel, the user switcher changes the active
role, the audit page renders, and `CONVENTIONS.md` exists.

Open a PR. Do not merge.