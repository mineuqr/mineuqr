import { readFileSync } from 'fs';
import { createAuditReadonlyConnection } from './scripts/lib/tidb-audit-connection.mjs';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const sql = readFileSync('drizzle/0010_flimsy_gateway.sql', 'utf8').trim();
console.log('Executing:', sql);

const conn = await createAuditReadonlyConnection(databaseUrl);
try {
  await conn.execute(sql);
  console.log('Migration applied successfully!');
} catch (err) {
  if (err.code === 'ER_DUP_FIELDNAME') {
    console.log('Column already exists, skipping.');
  } else {
    throw err;
  }
} finally {
  await conn.end();
}
