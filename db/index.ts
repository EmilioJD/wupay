import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let client: NeonHttpDatabase<typeof schema> | undefined;

/**
 * Drizzle client for the Neon database, created on first use so that importing
 * this module never requires DATABASE_URL (build time, tests, tooling).
 */
export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set");
    }
    client = drizzle(neon(url), { schema });
  }
  return client;
}

export { schema };
