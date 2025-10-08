import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!IS_VERCEL_ENV) {
      // run DB migration
      const runMigrate = await import("./lib/db/pg/migrate.pg").then(
        (m) => m.runMigrate,
      );
      await runMigrate().catch((e) => {
        console.error(e);
        process.exit(1);
      });
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager();
    }

    // Initialize file storage (logs will appear at startup)
    await import("./lib/file-storage").then(() => {
      console.log("File storage module loaded");
    });
  }
}
