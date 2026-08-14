---
name: testing-wupay-shell
description: How to run and end-to-end test the WuPay internal admin shell locally (identity cookie switching, action wrapper authorization, audit log).
---

# Testing the WuPay internal admin shell

## Running the app
- `pnpm` is on PATH (installed globally at the declared 9.15.4): `pnpm dev` / `build` / `lint` / `db:seed`. If it is missing, fall back to `corepack pnpm ...`.
- `DATABASE_URL` (Neon) is a session secret. Bind it into the shell env for anything that touches the DB or runs the app; never print it. `db/index.ts` creates the client lazily, so `build`/`lint` work without it, but page rendering does not.
- Dev server: http://localhost:3000 (Next 16 + Turbopack). Reuse an already-running one rather than starting a second on the same port.
- Seed is idempotent: `pnpm db:seed` creates viewer/support/approver/admin @example.test (Vera Viewer, Sam Support, Avery Approver, Adele Admin).

## Identity / roles
- Identity comes only from `getCurrentUser()` (`lib/identity.ts`) reading the httpOnly `wupay_user` cookie; unknown/garbage/missing value falls back to `viewer@example.test`.
- Switch users in the UI via the header "Acting as" `<select>` (auto-submits a POST form to `/api/identity/switch`, 303 back to referer). The role badge sits at the top-left of the header.
- To inspect the cookie flags or force a garbage value, use Chrome DevTools → Application → Cookies (the cookie is httpOnly, so `document.cookie` will not show it). Widen the DevTools panel; the cookie table columns are truncated in a narrow dock.
- Negative switch cases (unknown email) can't be produced from the dropdown — use `curl -i -b "wupay_user=admin@example.test" -d email=nobody@example.test http://localhost:3000/api/identity/switch` and assert 400 + no `set-cookie`.

## Exercising `action()` / the audit log
- `lib/action.ts` authorizes → runs handler → inserts an `audit_events` row. There may be no UI that calls it (no business features yet). To test it, add a TEMPORARY, uncommitted route and delete it afterwards, e.g. `app/api/dev/test-action/route.ts` with a GET that calls `action({name:"settings.touch",resource:"settings",allowedRoles:["admin"],...})` and returns 403 on `ForbiddenError`. Navigating the browser to that URL reuses the identity cookie, so role changes made in the dropdown apply.
- Denials must write no `audit_events` row; verify by comparing row counts on `/audit` before/after.
- Audit empty state: temporarily add `.where(sql`false`)` to the query in `app/(shell)/audit/page.tsx`, check the page, then `git checkout` the file. Never delete rows from the shared Neon table.
- Quick DB inspection: write a small `tsx` script (`npx tsx q.ts`) with an async `main()` — top-level await fails under the repo's tsx/cjs transform.

## Devin secrets needed
- `DATABASE_URL` (Neon Postgres connection string, session secret).
