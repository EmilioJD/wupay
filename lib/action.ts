import { getDb } from "@/db";
import { auditEvents, type Role } from "@/db/schema";
import { getCurrentUser, type CurrentUser } from "@/lib/identity";

export class ForbiddenError extends Error {
  constructor(action: string, role: Role) {
    super(`Role "${role}" is not allowed to run "${action}"`);
    this.name = "ForbiddenError";
  }
}

export type ActionContext = {
  user: CurrentUser;
};

export type ActionConfig<Input, Output> = {
  /** Stable identifier written to the audit log, e.g. "payout.approve". */
  name: string;
  /** Kind of thing being changed, e.g. "payout". */
  resource: string;
  allowedRoles: readonly Role[];
  /** Business logic only. Never writes audit events itself. */
  handler: (input: Input, ctx: ActionContext) => Promise<Output>;
  /** Optional id of the affected record, for the audit log. */
  resourceId?: (input: Input, output: Output) => string | undefined;
};

/**
 * Wraps every operation that changes data: authorizes the current user, runs
 * the handler, then records an audit event.
 */
export function action<Input, Output>(
  config: ActionConfig<Input, Output>,
): (input: Input) => Promise<Output> {
  return async function runAction(input: Input): Promise<Output> {
    const user = await getCurrentUser();
    if (!config.allowedRoles.includes(user.role)) {
      throw new ForbiddenError(config.name, user.role);
    }

    const output = await config.handler(input, { user });

    await getDb()
      .insert(auditEvents)
      .values({
        actorEmail: user.email,
        action: config.name,
        resource: config.resource,
        resourceId: config.resourceId?.(input, output) ?? null,
        details: input === undefined ? null : (input as unknown),
      });

    return output;
  };
}
