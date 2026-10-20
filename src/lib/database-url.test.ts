import { describe, expect, it } from "vitest";
import { prismaDatasourceUrl } from "./database-url";

describe("prismaDatasourceUrl", () => {
  it("returns undefined when no database URL is configured", () => {
    expect(prismaDatasourceUrl(undefined)).toBeUndefined();
  });

  it("disables named prepared statements for pooled/direct connections", () => {
    expect(
      prismaDatasourceUrl(
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      ),
    ).toBe(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres?pgbouncer=true",
    );
  });

  it("preserves existing query parameters", () => {
    expect(
      prismaDatasourceUrl(
        "postgresql://user:pass@db.example.com:6543/postgres?connection_limit=1",
      ),
    ).toBe(
      "postgresql://user:pass@db.example.com:6543/postgres?connection_limit=1&pgbouncer=true",
    );
  });

  it("does not duplicate an explicit pgbouncer setting", () => {
    const url =
      "postgresql://user:pass@db.example.com:6543/postgres?pgbouncer=true";
    expect(prismaDatasourceUrl(url)).toBe(url);
  });
});
