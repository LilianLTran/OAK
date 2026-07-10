/** Applies prisma/constraints.sql (EXCLUDE constraints Prisma can't model). */
import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

async function main() {
  const sql = readFileSync(join(__dirname, 'constraints.sql'), 'utf8');
  // Split on semicolons at end of statements; execute sequentially.
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'));
  for (const stmt of statements) {
    await prisma.$executeRawUnsafe(stmt);
  }
  console.log(`Applied ${statements.length} constraint statements.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
