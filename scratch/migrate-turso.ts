import { createClient } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.");
  process.exit(1);
}

const migrationSqlPath = path.join(
  process.cwd(),
  'prisma',
  'migrations',
  '20260618205852_add_blog_template_field',
  'migration.sql'
);

async function run() {
  console.log(`🔌 Connecting to Turso: ${url}`);
  const client = createClient({ url: url!, authToken: authToken! });
  
  console.log(`📖 Reading migration SQL: ${migrationSqlPath}`);
  const sqlText = fs.readFileSync(migrationSqlPath, 'utf8');

  console.log("⚡ Executing migration SQL on Turso...");
  try {
    await client.executeMultiple(sqlText);
    console.log("✅ Database schema migrated successfully on Turso!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    client.close();
  }
}

run();
