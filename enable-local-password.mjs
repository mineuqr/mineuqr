/**
 * Attach bcrypt password login to an existing user (no new user, no schema changes).
 * Usage: node enable-local-password.mjs [email] [password]
 * Defaults: k.sh61@yahoo.com / Admin123!
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { createAuditReadonlyConnection } from "./scripts/lib/tidb-audit-connection.mjs";

const EMAIL = process.argv[2] ?? "k.sh61@yahoo.com";
const PASSWORD = process.argv[3] ?? "Admin123!";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const connection = await createAuditReadonlyConnection(process.env.DATABASE_URL);

  try {
    const [rows] = await connection.execute(
      "SELECT id, openId, name, email, role, loginMethod FROM users WHERE email = ? LIMIT 1",
      [EMAIL]
    );

    if (rows.length === 0) {
      console.error(`No user found with email: ${EMAIL}`);
      process.exit(1);
    }

    const user = rows[0];
    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    await connection.execute(
      "UPDATE users SET passwordHash = ? WHERE id = ?",
      [passwordHash, user.id]
    );

    const [[restaurants]] = await connection.execute(
      "SELECT COUNT(*) AS count FROM restaurants WHERE userId = ?",
      [user.id]
    );
    const [[subscriptions]] = await connection.execute(
      "SELECT COUNT(*) AS count FROM user_subscriptions WHERE userId = ?",
      [user.id]
    );

    console.log("Password login enabled for existing account:");
    console.log(`  id:           ${user.id}`);
    console.log(`  openId:       ${user.openId} (unchanged)`);
    console.log(`  email:        ${user.email} (unchanged)`);
    console.log(`  role:         ${user.role} (unchanged)`);
    console.log(`  loginMethod:  ${user.loginMethod ?? "(null)"} (unchanged)`);
    console.log(`  password:     ${PASSWORD} (set locally — change after testing)`);
    console.log(`  restaurants:  ${restaurants.count}`);
    console.log(`  subscriptions: ${subscriptions.count}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
