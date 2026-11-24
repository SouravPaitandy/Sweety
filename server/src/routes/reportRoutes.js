const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");

const {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
} = require("../controllers/reportController");

const router = express.Router();

// All reports are private to the authenticated user.
router.use(authenticateToken);

router.get("/daily", getDailyReport);
router.get("/month-to-date", getMonthToDateReport);
router.get("/monthly", getMonthlyReport);

module.exports = router;
