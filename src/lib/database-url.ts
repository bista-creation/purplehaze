/**
 * Supabase transaction pooling and PgBouncer do not support Prisma's named
 * prepared statements. Without this flag, concurrent build workers/serverless
 * requests can fail intermittently with:
 *   prepared statement "s7" does not exist
 *
 * The flag is harmless on a direct PostgreSQL connection: it only disables
 * named prepared statements. `DIRECT_URL` remains unmodified for migrations.
 */
export function prismaDatasourceUrl(raw?: string | null) {
  const url = arguments.length > 0 ? (raw ?? undefined) : process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.startsWith("file:")) return url;
  if (/[?&]pgbouncer=/i.test(url)) return url;

  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);

  return `${base}${base.includes("?") ? "&" : "?"}pgbouncer=true${hash}`;
}
