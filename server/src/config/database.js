const { Pool, types } = require("pg");
require("dotenv").config();

// Ensure PostgreSQL DATE (type OID 1082) columns are returned as 'YYYY-MM-DD' strings,
// rather than being converted to JavaScript Date objects (which serialize to UTC ISO strings).
types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "kenpath_db",
});

// Handle unexpected errors from idle clients.
pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

module.exports = pool;
