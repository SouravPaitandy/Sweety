const request = require("supertest");
const app = require("../src/app");
const { createTestUser } = require("./helpers/authHelper");
const { cleanTestRecords } = require("./helpers/testDb");

describe("Reports API", () => {
  let userA;
  let userB;

  beforeEach(async () => {
    await cleanTestRecords();
    userA = await createTestUser({ email: `reportA_${Date.now()}@test.sweety` });
    userB = await createTestUser({ email: `reportB_${Date.now()}@test.sweety` });
  });

  afterAll(async () => {
    await cleanTestRecords();
  });

  describe("Authentication Guard", () => {
    it("rejects unauthenticated requests to report endpoints with 401", async () => {
      const endpoints = [
        request(app).get("/api/reports/daily"),
        request(app).get("/api/reports/month-to-date"),
        request(app).get("/api/reports/monthly"),
      ];

      for (const req of endpoints) {
        const res = await req;
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });
  });

  describe("Date Parameter Validation", () => {
    it("rejects invalid date formats with 400", async () => {
      const endpoints = ["/api/reports/daily", "/api/reports/month-to-date", "/api/reports/monthly"];

      for (const endpoint of endpoints) {
        const res = await request(app)
          .get(`${endpoint}?date=2026/11/20`)
          .set("Authorization", userA.authHeader);

        expect(res.status).toBe(400);
        expect(res.body.message).toBe("Please provide a valid date in YYYY-MM-DD format.");
      }
    });

    it("rejects future dates with 400", async () => {
      const res = await request(app)
        .get("/api/reports/daily?date=2099-01-01")
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Future dates are not allowed.");
    });
  });

  describe("Empty Report Responses", () => {
    it("returns null summary statistics and empty readings array when no readings exist", async () => {
      const targetDate = "2026-11-15";

      const dailyRes = await request(app)
        .get(`/api/reports/daily?date=${targetDate}`)
        .set("Authorization", userA.authHeader);

      expect(dailyRes.status).toBe(200);
      expect(dailyRes.body.success).toBe(true);
      expect(dailyRes.body.data.reportType).toBe("daily");
      expect(dailyRes.body.data.period).toEqual({
        startDate: targetDate,
        endDate: targetDate,
      });
      expect(dailyRes.body.data.summary).toEqual({
        highest: null,
        lowest: null,
        average: null,
        count: 0,
      });
      expect(dailyRes.body.data.readings).toEqual([]);

      const mtdRes = await request(app)
        .get(`/api/reports/month-to-date?date=${targetDate}`)
        .set("Authorization", userA.authHeader);

      expect(mtdRes.status).toBe(200);
      expect(mtdRes.body.data.summary.count).toBe(0);
      expect(mtdRes.body.data.summary.average).toBeNull();
      expect(mtdRes.body.data.readings).toEqual([]);

      const monthlyRes = await request(app)
        .get(`/api/reports/monthly?date=${targetDate}`)
        .set("Authorization", userA.authHeader);

      expect(monthlyRes.status).toBe(200);
      expect(monthlyRes.body.data.summary.count).toBe(0);
      expect(monthlyRes.body.data.readings).toEqual([]);
    });
  });

  describe("GET /api/reports/daily", () => {
    it("calculates summary statistics and returns readings ordered by slot for the day", async () => {
      const targetDate = "2026-11-20";

      // Insert readings: 90 (Morning), 160 (After breakfast), 110 (After dinner)
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: targetDate, slot: "After dinner", value: 110 });

      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: targetDate, slot: "Morning", value: 90 });

      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: targetDate, slot: "After breakfast", value: 160 });

      const res = await request(app)
        .get(`/api/reports/daily?date=${targetDate}`)
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reportType).toBe("daily");
      expect(res.body.data.summary).toEqual({
        highest: 160,
        lowest: 90,
        average: "120.0", // (90 + 160 + 110) / 3 = 120.0 (PostgreSQL ::numeric returns string)
        count: 3,
      });

      // Verify slot order: Morning -> After breakfast -> After dinner
      const readings = res.body.data.readings;
      expect(readings).toHaveLength(3);
      expect(readings[0].slot).toBe("Morning");
      expect(readings[1].slot).toBe("After breakfast");
      expect(readings[2].slot).toBe("After dinner");
    });
  });

  describe("GET /api/reports/month-to-date", () => {
    it("aggregates readings from the 1st of the month up to the selected date", async () => {
      const selectedDate = "2026-11-15";

      // Reading 1: within month, before selectedDate
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-11-02", slot: "Morning", value: 100 });

      // Reading 2: on selectedDate
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: selectedDate, slot: "After lunch", value: 140 });

      // Reading 3: within same month, but after selectedDate (should be excluded)
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-11-18", slot: "Morning", value: 250 });

      // Reading 4: previous month (should be excluded)
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-10-31", slot: "Morning", value: 300 });

      const res = await request(app)
        .get(`/api/reports/month-to-date?date=${selectedDate}`)
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe("month-to-date");
      expect(res.body.data.period).toEqual({
        startDate: "2026-11-01",
        endDate: selectedDate,
      });
      expect(res.body.data.summary).toEqual({
        highest: 140,
        lowest: 100,
        average: "120.0",
        count: 2,
      });
      // Month-to-date returns empty readings array by specification
      expect(res.body.data.readings).toEqual([]);
    });
  });

  describe("GET /api/reports/monthly", () => {
    it("aggregates readings across the entire previous calendar month", async () => {
      const selectedDate = "2026-11-20";

      // Readings in October (previous month)
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-10-01", slot: "Morning", value: 80 });

      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-10-31", slot: "After dinner", value: 120 });

      // Reading in November (current month, should be excluded)
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-11-05", slot: "Morning", value: 350 });

      const res = await request(app)
        .get(`/api/reports/monthly?date=${selectedDate}`)
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.reportType).toBe("monthly");
      expect(res.body.data.period).toEqual({
        startDate: "2026-10-01",
        endDate: "2026-10-31",
      });
      expect(res.body.data.summary).toEqual({
        highest: 120,
        lowest: 80,
        average: "100.0",
        count: 2,
      });
    });
  });

  describe("User Data Isolation in Reports", () => {
    it("ensures User A's reports only aggregate User A's readings, ignoring User B", async () => {
      const targetDate = "2026-11-20";

      // User A reading: 100
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: targetDate, slot: "Morning", value: 100 });

      // User B reading on same date: 300
      await request(app)
        .post("/api/readings")
        .set("Authorization", userB.authHeader)
        .send({ date: targetDate, slot: "Morning", value: 300 });

      // Fetch User A daily report
      const resA = await request(app)
        .get(`/api/reports/daily?date=${targetDate}`)
        .set("Authorization", userA.authHeader);

      expect(resA.body.data.summary).toEqual({
        highest: 100,
        lowest: 100,
        average: "100.0",
        count: 1,
      });
      expect(resA.body.data.readings).toHaveLength(1);
      expect(resA.body.data.readings[0].value).toBe(100);

      // Fetch User B daily report
      const resB = await request(app)
        .get(`/api/reports/daily?date=${targetDate}`)
        .set("Authorization", userB.authHeader);

      expect(resB.body.data.summary).toEqual({
        highest: 300,
        lowest: 300,
        average: "300.0",
        count: 1,
      });
      expect(resB.body.data.readings).toHaveLength(1);
      expect(resB.body.data.readings[0].value).toBe(300);
    });
  });
});
