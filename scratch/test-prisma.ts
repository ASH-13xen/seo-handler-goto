import dotenv from 'dotenv';
dotenv.config();
console.log("DEBUG DATABASE_URL:", process.env.DATABASE_URL);

async function run() {
  const { prisma } = await import('../src/lib/db');
  console.log("Running prisma.clientSite.findMany()...");
  try {
    const result = await prisma.clientSite.findMany();
    console.log("Query success! Result:", result);
  } catch (err: any) {
    console.error("Query failed with stack:");
    console.error(err.stack || err);
  }
}
run();
