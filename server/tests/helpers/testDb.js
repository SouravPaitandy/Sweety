const pool = require("../../src/config/database");

const trackedUserIds = new Set();

const trackUser = (id) => {
  if (id) {
    trackedUserIds.add(String(id));
  }
};

/**
 * Remove only test-generated records.
 * Uses strict safety assertion to prevent running against non-test databases.
 */
const cleanTestRecords = async () => {
  const check = await pool.query("SELECT current_database() AS db");
  if (check.rows[0].db !== "sweety_test") {
    throw new Error(
      `SAFETY ABORT: cleanTestRecords called on database "${check.rows[0].db}" instead of "sweety_test"!`
    );
  }

  if (trackedUserIds.size > 0) {
    const ids = Array.from(trackedUserIds);
    await pool.query("DELETE FROM users WHERE id = ANY($1::bigint[])", [ids]);
    trackedUserIds.clear();
  }

  // Also clean any test users created matching the test domain
  await pool.query("DELETE FROM users WHERE email LIKE '%@test.sweety'");
};

module.exports = {
  pool,
  trackUser,
  cleanTestRecords,
};
