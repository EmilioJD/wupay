import { neon } from '@neondatabase/serverless'

export default async function Page() {
  const sql = neon(process.env.DATABASE_URL!)
  const [row] = await sql`select now()`
  return <pre>{JSON.stringify(row)}</pre>
}
