const express = require("express");

const {
  register,
  login,
  getCurrentUser,
} = require("../controllers/authController");

const authenticateToken = require("../middleware/authMiddleware");

const router = express.Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", authenticateToken, getCurrentUser);

module.exports = router;
