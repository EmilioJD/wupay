import "dotenv/config";

import { getDb } from "./index";
import { users } from "./schema";

const seededUsers = [
  { email: "viewer@example.test", name: "Vera Viewer", role: "viewer" },
  { email: "support@example.test", name: "Sam Support", role: "support" },
  { email: "approver@example.test", name: "Avery Approver", role: "approver" },
  { email: "admin@example.test", name: "Adele Admin", role: "admin" },
] as const;

async function seed() {
  const db = getDb();
  for (const user of seededUsers) {
    await db
      .insert(users)
      .values(user)
      .onConflictDoUpdate({
        target: users.email,
        set: { name: user.name, role: user.role },
      });
  }
  console.log(`Seeded ${seededUsers.length} users.`);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
