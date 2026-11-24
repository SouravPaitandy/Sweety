const path = require("path");
const dotenv = require("dotenv");

// Enforce test environment variables before requiring any application modules
dotenv.config({
  path: path.resolve(__dirname, "../.env.test"),
  override: true,
});

process.env.NODE_ENV = "test";
process.env.DB_NAME = "sweety_test";

const pool = require("../src/config/database");

// Hard database safety assertion
beforeAll(async () => {
  const result = await pool.query("SELECT current_database() AS db");
  const connectedDb = result.rows[0].db;

  if (connectedDb !== "sweety_test") {
    throw new Error(
      `CRITICAL SAFETY VIOLATION: Connected to database "${connectedDb}". Expected "sweety_test". Aborting all tests immediately!`
    );
  }
});

// Close connection pool to ensure clean Jest exit with no open handles
afterAll(async () => {
  await pool.end();
});
