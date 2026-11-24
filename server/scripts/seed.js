const bcrypt = require("bcrypt");
const pool = require("../src/config/database");

// Format Date object to YYYY-MM-DD in local time
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Demo user credentials
const DEMO_USER = {
  name: "Demo User",
  email: "demo@sweety.app",
  password: "Password123!",
};

async function seed() {
  console.log("Starting Sweety database seeding...");

  try {
    // 1. Strict safety guard: Only run against development database "sweety"
    const dbCheck = await pool.query("SELECT current_database() AS db");
    const currentDb = dbCheck.rows[0].db;

    if (currentDb !== "sweety") {
      console.error(
        `SAFETY ABORT: The seed script is restricted to the development database "sweety". Connected to "${currentDb}". Aborting immediately!`
      );
      process.exit(1);
    }

    console.log(`Verified target database: "${currentDb}".`);

    // 2. Insert or update the demo account (Idempotent)
    const passwordHash = await bcrypt.hash(DEMO_USER.password, 12);

    const userResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (email)
       DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash
       RETURNING id, name, email`,
      [DEMO_USER.name, DEMO_USER.email, passwordHash],
    );

    const user = userResult.rows[0];
    console.log(`Demo account ready: ${user.email} (ID: ${user.id})`);

    // 3. Generate sample readings across current and previous months
    const now = new Date();

    const daysAgo = (n) => {
      const d = new Date(now);
      d.setDate(d.getDate() - n);
      return formatDate(d);
    };

    // Calculate dates in previous month for historical reporting
    const prevMonthMid = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 15));
    const prevMonthEnd = formatDate(new Date(now.getFullYear(), now.getMonth() - 1, 24));

    const sampleReadings = [
      // Today (3 readings so user can add the 4th reading during demo)
      { date: daysAgo(0), slot: "Morning", value: 98 },
      { date: daysAgo(0), slot: "After breakfast", value: 135 },
      { date: daysAgo(0), slot: "After lunch", value: 142 },

      // Yesterday (Full 4 readings)
      { date: daysAgo(1), slot: "Morning", value: 92 },
      { date: daysAgo(1), slot: "After breakfast", value: 128 },
      { date: daysAgo(1), slot: "After lunch", value: 145 },
      { date: daysAgo(1), slot: "After dinner", value: 118 },

      // 2 Days ago (Full 4 readings)
      { date: daysAgo(2), slot: "Morning", value: 104 },
      { date: daysAgo(2), slot: "After breakfast", value: 155 },
      { date: daysAgo(2), slot: "After lunch", value: 138 },
      { date: daysAgo(2), slot: "After dinner", value: 122 },

      // 4 Days ago
      { date: daysAgo(4), slot: "Morning", value: 88 },
      { date: daysAgo(4), slot: "After breakfast", value: 130 },
      { date: daysAgo(4), slot: "After dinner", value: 112 },

      // 7 Days ago
      { date: daysAgo(7), slot: "Morning", value: 95 },
      { date: daysAgo(7), slot: "After lunch", value: 160 },
      { date: daysAgo(7), slot: "After dinner", value: 125 },

      // Previous Month readings (for monthly report demonstration)
      { date: prevMonthMid, slot: "Morning", value: 90 },
      { date: prevMonthMid, slot: "After breakfast", value: 140 },
      { date: prevMonthMid, slot: "After dinner", value: 115 },
      { date: prevMonthEnd, slot: "Morning", value: 102 },
      { date: prevMonthEnd, slot: "After lunch", value: 148 },
    ];

    let insertedCount = 0;

    for (const reading of sampleReadings) {
      await pool.query(
        `INSERT INTO readings (user_id, reading_date, slot, glucose_value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reading_date, slot)
         DO UPDATE SET
           glucose_value = EXCLUDED.glucose_value,
           updated_at = NOW()`,
        [user.id, reading.date, reading.slot, reading.value],
      );
      insertedCount++;
    }

    console.log(`Seeded ${insertedCount} representative glucose readings successfully.`);
    console.log("--------------------------------------------------");
    console.log("Demo Credentials:");
    console.log(`  Email:    ${DEMO_USER.email}`);
    console.log(`  Password: ${DEMO_USER.password}`);
    console.log("--------------------------------------------------");
    console.log("Database seeding completed successfully.");
  } catch (error) {
    console.error("Database seeding failed:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
