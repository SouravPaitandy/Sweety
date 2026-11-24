const request = require("supertest");
const app = require("../src/app");
const { createTestUser } = require("./helpers/authHelper");
const { cleanTestRecords } = require("./helpers/testDb");

describe("Authentication & Authorization API", () => {
  beforeEach(async () => {
    await cleanTestRecords();
  });

  afterAll(async () => {
    await cleanTestRecords();
  });

  describe("POST /api/auth/register", () => {
    it("successfully registers a new user with valid credentials", async () => {
      const payload = {
        name: "Alice Walker",
        email: `alice_${Date.now()}@test.sweety`,
        password: "StrongPassword123!",
      };

      const res = await request(app)
        .post("/api/auth/register")
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Account created successfully.");
      expect(res.body.data).toBeDefined();
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toMatchObject({
        name: "Alice Walker",
        email: payload.email.toLowerCase(),
      });
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.created_at).toBeDefined();
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it("rejects registration with duplicate email (409 Conflict)", async () => {
      const email = `duplicate_${Date.now()}@test.sweety`;
      await createTestUser({ email });

      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Second Person",
          email: email.toUpperCase(), // Test case-insensitive collision
          password: "AnotherPassword123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("An account with this email already exists.");
    });

    it("rejects missing or empty required fields (400 Bad Request)", async () => {
      const testCases = [
        {},
        { name: "Only Name" },
        { email: "only@test.sweety" },
        { password: "password123" },
        { name: "   ", email: "valid@test.sweety", password: "password123" },
        { name: "Name", email: "   ", password: "password123" },
      ];

      for (const payload of testCases) {
        const res = await request(app)
          .post("/api/auth/register")
          .send(payload);

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Name, email and password are required.");
      }
    });

    it("rejects name exceeding 100 characters (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "A".repeat(101),
          email: `toolong_${Date.now()}@test.sweety`,
          password: "ValidPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Name cannot exceed 100 characters.");
    });

    it("rejects invalid email formats (400 Bad Request)", async () => {
      const invalidEmails = ["plainaddress", "missing@domain", "@missinguser.com", "spaces in@email.com"];

      for (const email of invalidEmails) {
        const res = await request(app)
          .post("/api/auth/register")
          .send({
            name: "Valid Name",
            email,
            password: "ValidPassword123!",
          });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toBe("Please provide a valid email address.");
      }
    });

    it("rejects passwords shorter than 8 characters (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Short Pwd User",
          email: `short_${Date.now()}@test.sweety`,
          password: "short",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Password must be between 8 and 72 characters.");
    });

    it("rejects passwords longer than 72 bytes (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Long Pwd User",
          email: `long_${Date.now()}@test.sweety`,
          password: "X".repeat(73),
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Password must be between 8 and 72 characters.");
    });
  });

  describe("POST /api/auth/login", () => {
    it("successfully logs in with valid credentials", async () => {
      const password = "CorrectPassword123!";
      const { userData } = await createTestUser({ password });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Login successful.");
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(userData.email);
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it("rejects login with non-existent email (401 Unauthorized)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent@test.sweety",
          password: "SomePassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid email or password.");
    });

    it("rejects login with incorrect password (401 Unauthorized)", async () => {
      const { userData } = await createTestUser({ password: "RealPassword123!" });

      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: userData.email,
          password: "WrongPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid email or password.");
    });

    it("rejects login with missing email or password (400 Bad Request)", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "test@test.sweety" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Email and password are required.");
    });
  });

  describe("GET /api/auth/me", () => {
    it("returns user profile for valid Bearer token", async () => {
      const { user, authHeader } = await createTestUser();

      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", authHeader);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toMatchObject({
        id: user.id,
        name: user.name,
        email: user.email,
      });
      expect(res.body.data.user.password_hash).toBeUndefined();
    });

    it("rejects request without Authorization header (401 Unauthorized)", async () => {
      const res = await request(app).get("/api/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Authentication required. Please login.");
    });

    it("rejects malformed Authorization header (401 Unauthorized)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Basic not_bearer");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Authentication required. Please login.");
    });

    it("rejects invalid or expired token (401 Unauthorized)", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid.token.payload");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("Invalid or expired authentication token.");
    });
  });
});
