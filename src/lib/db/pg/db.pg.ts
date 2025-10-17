// import { Logger } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";

// class MyLogger implements Logger {
//   logQuery(query: string, params: unknown[]): void {
//     console.log({ query, params });
//   }
// }

// Build connection string with appropriate SSL mode
const buildConnectionString = () => {
  const baseUrl = process.env.POSTGRES_URL || "";

  // If URL already has query parameters, don't append anything
  if (baseUrl.includes("?")) {
    return baseUrl;
  }

  // For local development, disable SSL entirely (Docker Postgres has no SSL)
  // For production, use no-verify (SSL without certificate verification)
  const sslMode =
    process.env.NODE_ENV === "development" ? "disable" : "no-verify";
  return `${baseUrl}?sslmode=${sslMode}`;
};

export const pgDb = drizzlePg(buildConnectionString(), {
  //   logger: new MyLogger(),
});
