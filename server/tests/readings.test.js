const request = require("supertest");
const app = require("../src/app");
const { createTestUser } = require("./helpers/authHelper");
const { cleanTestRecords } = require("./helpers/testDb");

describe("Readings API", () => {
  let userA;
  let userB;

  // Use a fixed historical/current date in YYYY-MM-DD
  const testDate = "2026-11-20";

  beforeEach(async () => {
    await cleanTestRecords();
    userA = await createTestUser({ email: `userA_${Date.now()}@test.sweety` });
    userB = await createTestUser({ email: `userB_${Date.now()}@test.sweety` });
  });

  afterAll(async () => {
    await cleanTestRecords();
  });

  describe("Authentication Guard", () => {
    it("rejects unauthenticated requests with 401", async () => {
      const endpoints = [
        request(app).get("/api/readings"),
        request(app).get("/api/readings/1"),
        request(app).post("/api/readings").send({ date: testDate, slot: "Morning", value: 100 }),
        request(app).put("/api/readings/1").send({ date: testDate, slot: "Morning", value: 100 }),
        request(app).delete("/api/readings/1"),
      ];

      for (const req of endpoints) {
        const res = await req;
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
      }
    });
  });

  describe("POST /api/readings (Create & Validation)", () => {
    it("successfully creates a reading with valid data", async () => {
      const payload = {
        date: testDate,
        slot: "Morning",
        value: 115,
      };

      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Reading created successfully.");
      expect(res.body.data.reading).toMatchObject({
        date: testDate,
        slot: "Morning",
        value: 115,
      });
      expect(res.body.data.reading.id).toBeDefined();
      expect(res.body.data.reading.createdAt).toBeDefined();
      expect(res.body.data.reading.updatedAt).toBeDefined();
    });

    it("rejects missing fields with 400 and structured validation errors", async () => {
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Validation failed.");
      expect(res.body.errors).toMatchObject({
        date: "Reading date is required.",
        slot: "Reading slot is required.",
        value: "Glucose value is required.",
      });
    });

    it("rejects malformed date strings with 400", async () => {
      const invalidDates = ["20-11-2026", "2026/11/20", "2026-02-31", "not-a-date"];

      for (const date of invalidDates) {
        const res = await request(app)
          .post("/api/readings")
          .set("Authorization", userA.authHeader)
          .send({ date, slot: "Morning", value: 100 });

        expect(res.status).toBe(400);
        expect(res.body.errors.date).toBe("Please provide a valid date in YYYY-MM-DD format.");
      }
    });

    it("rejects future dates with 400", async () => {
      // 2099 is definitely in the future
      const res = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2099-01-01", slot: "Morning", value: 100 });

      expect(res.status).toBe(400);
      expect(res.body.errors.date).toBe("Future dates are not allowed.");
    });

    it("rejects invalid slots outside the four permitted values", async () => {
      const invalidSlots = ["Midnight", "Before lunch", "Snack", "after dinner"];

      for (const slot of invalidSlots) {
        const res = await request(app)
          .post("/api/readings")
          .set("Authorization", userA.authHeader)
          .send({ date: testDate, slot, value: 100 });

        expect(res.status).toBe(400);
        expect(res.body.errors.slot).toBe("Please select a valid reading slot.");
      }
    });

    it("rejects out-of-range or decimal glucose values", async () => {
      const testCases = [
        { value: 39, expectedError: "Glucose value must be between 40 and 600 mg/dL." },
        { value: 601, expectedError: "Glucose value must be between 40 and 600 mg/dL." },
        { value: 120.5, expectedError: "Glucose value must be a whole number." },
        { value: "high", expectedError: "Glucose value must be a whole number." },
      ];

      for (const { value, expectedError } of testCases) {
        const res = await request(app)
          .post("/api/readings")
          .set("Authorization", userA.authHeader)
          .send({ date: testDate, slot: "Morning", value });

        expect(res.status).toBe(400);
        expect(res.body.errors.value).toBe(expectedError);
      }
    });
  });

  describe("Duplicate Slot Prevention & Maximum Four Readings Per Day", () => {
    it("rejects duplicate reading for the same slot on the same date with 409 Conflict", async () => {
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 110 });

      const duplicateRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 130 });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toBe("A reading already exists for this slot and date.");
    });

    it("allows up to exactly four readings per day (one per slot) and prevents any fifth reading", async () => {
      const slots = ["Morning", "After breakfast", "After lunch", "After dinner"];

      // 1. Insert all 4 permitted slots
      for (let i = 0; i < slots.length; i++) {
        const res = await request(app)
          .post("/api/readings")
          .set("Authorization", userA.authHeader)
          .send({ date: testDate, slot: slots[i], value: 100 + i * 10 });

        expect(res.status).toBe(201);
      }

      // Verify all 4 exist
      const listRes = await request(app)
        .get(`/api/readings?date=${testDate}`)
        .set("Authorization", userA.authHeader);

      expect(listRes.body.count).toBe(4);
      expect(listRes.body.data.readings).toHaveLength(4);

      // 2. Attempting to add any 5th reading on the same day fails with exact limit message
      const fifthRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 150 });

      expect(fifthRes.status).toBe(400);
      expect(fifthRes.body.success).toBe(false);
      expect(fifthRes.body.message).toBe("You can add only 4 readings per day.");

      // If attempting an invalid slot name when 4 exist, validator also rejects with 400
      const extraSlotRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Bedtime", value: 150 });

      expect(extraSlotRes.status).toBe(400);
    });

    it("prevents moving a reading via update to a date that already has four readings", async () => {
      const slots = ["Morning", "After breakfast", "After lunch", "After dinner"];

      // Fill testDate with 4 readings
      for (const slot of slots) {
        await request(app)
          .post("/api/readings")
          .set("Authorization", userA.authHeader)
          .send({ date: testDate, slot, value: 110 });
      }

      // Create a 5th reading on a different date (2026-11-19)
      const otherDayRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-11-19", slot: "Morning", value: 120 });

      const readingId = otherDayRes.body.data.reading.id;

      // Attempt to move this reading to testDate (which already has 4 readings)
      const moveRes = await request(app)
        .put(`/api/readings/${readingId}`)
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 125 });

      expect(moveRes.status).toBe(400);
      expect(moveRes.body.success).toBe(false);
      expect(moveRes.body.message).toBe("You can add only 4 readings per day.");
    });
  });

  describe("GET /api/readings and GET /api/readings/:id", () => {
    it("returns readings sorted by date DESC and slot order ASC", async () => {
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-11-19", slot: "Morning", value: 100 });

      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "After lunch", value: 140 });

      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 95 });

      const res = await request(app)
        .get("/api/readings")
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(3);

      const items = res.body.data.readings;
      // testDate (2026-11-20) readings come first, with Morning before After lunch
      expect(items[0].date).toBe(testDate);
      expect(items[0].slot).toBe("Morning");
      expect(items[1].date).toBe(testDate);
      expect(items[1].slot).toBe("After lunch");
      expect(items[2].date).toBe("2026-11-19");
    });

    it("filters readings by ?date=YYYY-MM-DD", async () => {
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 100 });

      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: "2026-11-19", slot: "Morning", value: 105 });

      const res = await request(app)
        .get(`/api/readings?date=${testDate}`)
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.data.readings[0].date).toBe(testDate);
    });

    it("rejects invalid ?date query with 400", async () => {
      const res = await request(app)
        .get("/api/readings?date=invalid-date")
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid date filter. Use YYYY-MM-DD.");
    });

    it("fetches single reading by valid ID", async () => {
      const createRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 110 });

      const readingId = createRes.body.data.reading.id;

      const res = await request(app)
        .get(`/api/readings/${readingId}`)
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.reading.id).toBe(readingId);
      expect(res.body.data.reading.slot).toBe("Morning");
    });

    it("returns 400 for non-numeric reading ID", async () => {
      const res = await request(app)
        .get("/api/readings/abc")
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Invalid reading ID.");
    });

    it("returns 404 for non-existent reading ID", async () => {
      const res = await request(app)
        .get("/api/readings/99999999")
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reading not found.");
    });
  });

  describe("PUT /api/readings/:id (Update)", () => {
    it("successfully updates an existing reading", async () => {
      const createRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 100 });

      const readingId = createRes.body.data.reading.id;

      const updateRes = await request(app)
        .put(`/api/readings/${readingId}`)
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "After breakfast", value: 145 });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.success).toBe(true);
      expect(updateRes.body.data.reading.slot).toBe("After breakfast");
      expect(updateRes.body.data.reading.value).toBe(145);
    });

    it("returns 409 when updating slot to an already existing slot on that date", async () => {
      await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 100 });

      const second = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "After breakfast", value: 120 });

      const collisionRes = await request(app)
        .put(`/api/readings/${second.body.data.reading.id}`)
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 130 });

      expect(collisionRes.status).toBe(409);
      expect(collisionRes.body.message).toBe("A reading already exists for this slot and date.");
    });
  });

  describe("DELETE /api/readings/:id", () => {
    it("successfully deletes a reading", async () => {
      const createRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 100 });

      const readingId = createRes.body.data.reading.id;

      const deleteRes = await request(app)
        .delete(`/api/readings/${readingId}`)
        .set("Authorization", userA.authHeader);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe("Reading deleted successfully.");

      // Verify it no longer exists
      const getRes = await request(app)
        .get(`/api/readings/${readingId}`)
        .set("Authorization", userA.authHeader);

      expect(getRes.status).toBe(404);
    });

    it("returns 404 when deleting non-existent reading", async () => {
      const res = await request(app)
        .delete("/api/readings/99999999")
        .set("Authorization", userA.authHeader);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Reading not found.");
    });
  });

  describe("User Data Isolation", () => {
    it("prevents User B from accessing, modifying, or deleting User A's readings", async () => {
      // User A creates a reading
      const createRes = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 110 });

      const readingId = createRes.body.data.reading.id;

      // User B lists readings: User A's reading is absent
      const userBList = await request(app)
        .get("/api/readings")
        .set("Authorization", userB.authHeader);

      expect(userBList.body.data.readings).toHaveLength(0);

      // User B attempts to GET User A's reading: returns 404
      const getOther = await request(app)
        .get(`/api/readings/${readingId}`)
        .set("Authorization", userB.authHeader);

      expect(getOther.status).toBe(404);
      expect(getOther.body.message).toBe("Reading not found.");

      // User B attempts to PUT User A's reading: returns 404
      const putOther = await request(app)
        .put(`/api/readings/${readingId}`)
        .set("Authorization", userB.authHeader)
        .send({ date: testDate, slot: "After lunch", value: 150 });

      expect(putOther.status).toBe(404);

      // User B attempts to DELETE User A's reading: returns 404
      const deleteOther = await request(app)
        .delete(`/api/readings/${readingId}`)
        .set("Authorization", userB.authHeader);

      expect(deleteOther.status).toBe(404);

      // Verify User A's reading is intact
      const checkA = await request(app)
        .get(`/api/readings/${readingId}`)
        .set("Authorization", userA.authHeader);

      expect(checkA.status).toBe(200);
      expect(checkA.body.data.reading.value).toBe(110);
    });

    it("allows User A and User B to independently record readings for the exact same date and slot", async () => {
      const resA = await request(app)
        .post("/api/readings")
        .set("Authorization", userA.authHeader)
        .send({ date: testDate, slot: "Morning", value: 100 });

      const resB = await request(app)
        .post("/api/readings")
        .set("Authorization", userB.authHeader)
        .send({ date: testDate, slot: "Morning", value: 120 });

      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
    });
  });
});
