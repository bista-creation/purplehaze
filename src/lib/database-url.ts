/**
 * Supabase transaction pooling and PgBouncer do not support Prisma's named
 * prepared statements. Without this flag, concurrent build workers/serverless
 * requests can fail intermittently with:
 *   prepared statement "s7" does not exist
 *
 * The flag is harmless on a direct PostgreSQL connection: it only disables
 * named prepared statements. `DIRECT_URL` remains unmodified for migrations.
 */
export function prismaDatasourceUrl(raw = process.env.DATABASE_URL) {
  if (!raw) return undefined;
  if (raw.startsWith("file:")) return raw;
  if (/[?&]pgbouncer=/i.test(raw)) return raw;

  const hashIndex = raw.indexOf("#");
  const base = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : raw.slice(hashIndex);

  return `${base}${base.includes("?") ? "&" : "?"}pgbouncer=true${hash}`;
}
