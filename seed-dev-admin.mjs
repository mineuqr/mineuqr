/**
 * One-off dev admin seed (local email/password auth only).
 * Usage: node seed-dev-admin.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const EMAIL = "admin@mineuqr.local";
const PASSWORD = "Admin123!";
const OPEN_ID = `local_${EMAIL}`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [existing] = await connection.execute(
      "SELECT id, openId FROM users WHERE email = ? OR openId = ? LIMIT 1",
      [EMAIL, OPEN_ID]
    );

    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    if (existing.length > 0) {
      await connection.execute(
        `UPDATE users SET openId = ?, name = ?, email = ?, loginMethod = ?, passwordHash = ?, role = 'admin', lastSignedIn = ? WHERE id = ?`,
        [OPEN_ID, "Dev Admin", EMAIL, "email", passwordHash, now, existing[0].id]
      );
      console.log(`Updated dev admin (id=${existing[0].id})`);
    } else {
      await connection.execute(
        `INSERT INTO users (openId, name, email, loginMethod, passwordHash, role, lastSignedIn, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'admin', ?, ?, ?)`,
        [OPEN_ID, "Dev Admin", EMAIL, "email", passwordHash, now, now, now]
      );
      console.log("Created dev admin user");
    }

    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${PASSWORD}`);
    console.log(`  openId:   ${OPEN_ID}`);
    console.log(`  role:     admin`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
