import { colorize } from "consola/utils";
import { sql } from "drizzle-orm";
import "load-env";

// Import database connection
const { pgDb } = await import("lib/db/pg/db.pg");
const { runMigrate } = await import("lib/db/pg/migrate.pg");

async function resetDatabase() {
  console.log("🔄 Starting database reset...");

  try {
    // Drop all tables
    console.log("🗑️  Dropping all tables...");

    await pgDb.execute(sql`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        -- Drop all tables in the public schema
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        
        -- Drop all sequences in the public schema
        FOR r IN (SELECT sequencename FROM pg_sequences WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP SEQUENCE IF EXISTS public.' || quote_ident(r.sequencename) || ' CASCADE';
        END LOOP;
        
        -- Drop all types in the public schema
        FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') AND typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);

    console.log("✅ All tables, sequences, and types dropped");

    // Run migrations to recreate the schema
    console.log("📦 Recreating database schema...");
    await runMigrate();

    console.log(colorize("green", "✨ Database reset completed successfully!"));
    process.exit(0);
  } catch (err) {
    console.error(colorize("red", "❌ Database reset failed:"), err);
    process.exit(1);
  }
}

resetDatabase();
