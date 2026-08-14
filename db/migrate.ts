import "dotenv/config";

import { spawnSync } from "node:child_process";

/**
 * Applies pending migrations before a build so a deployment can never run
 * against a database that is missing tables. Skipped when DATABASE_URL is
 * absent, which is how `pnpm build` stays usable for tooling and CI.
 */
if (!process.env.DATABASE_URL) {
  console.warn(
    "DATABASE_URL is not set: skipping migrations. The build will succeed but " +
      "pages will fail at runtime if the database is not already migrated.",
  );
  process.exit(0);
}

const result = spawnSync("drizzle-kit", ["migrate"], { stdio: "inherit" });

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
