import { eq } from "drizzle-orm";
import { cookies } from "next/headers";

import { getDb } from "@/db";
import { users, type Role } from "@/db/schema";

export const IDENTITY_COOKIE = "wupay_user";

export const DEFAULT_USER_EMAIL = "viewer@example.test";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

async function findByEmail(email: string): Promise<CurrentUser | undefined> {
  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return user;
}

/**
 * The only way identity enters the application. Replacing the body with a real
 * OIDC lookup requires no changes anywhere else.
 */
export async function getCurrentUser(): Promise<CurrentUser> {
  const email = (await cookies()).get(IDENTITY_COOKIE)?.value;
  const user = email ? await findByEmail(email) : undefined;
  if (user) {
    return user;
  }

  const fallback = await findByEmail(DEFAULT_USER_EMAIL);
  if (!fallback) {
    throw new Error(
      `No user ${DEFAULT_USER_EMAIL} found. Run the database seed (pnpm db:seed).`,
    );
  }
  return fallback;
}

export async function listSwitchableUsers(): Promise<CurrentUser[]> {
  return getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
    })
    .from(users)
    .orderBy(users.email);
}
