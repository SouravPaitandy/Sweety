const request = require("supertest");
const app = require("../../src/app");
const { trackUser } = require("./testDb");

let counter = 0;

/**
 * Creates and registers a unique test user.
 * Returns the credentials, user object, token, and ready-to-use Bearer auth header.
 */
const createTestUser = async (overrides = {}) => {
  counter += 1;
  const uniqueTag = `${Date.now()}_${counter}_${Math.random().toString(36).slice(2, 6)}`;

  const userData = {
    name: overrides.name || `User ${uniqueTag}`,
    email: overrides.email || `user_${uniqueTag}@test.sweety`,
    password: overrides.password || "Password123!",
  };

  const response = await request(app)
    .post("/api/auth/register")
    .send(userData);

  if (response.status === 201 && response.body?.data?.user?.id) {
    trackUser(response.body.data.user.id);
  }

  return {
    userData,
    status: response.status,
    body: response.body,
    user: response.body?.data?.user,
    token: response.body?.data?.token,
    authHeader: response.body?.data?.token ? `Bearer ${response.body.data.token}` : null,
  };
};

module.exports = {
  createTestUser,
};
