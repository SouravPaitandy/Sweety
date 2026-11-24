const express = require("express");

const authenticateToken = require("../middleware/authMiddleware");
const { validateReading } = require("../validators/readingValidator");

const {
  getReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
} = require("../controllers/readingController");

const router = express.Router();

// All reading endpoints require authentication.
router.use(authenticateToken);

router.get("/", getReadings);
router.get("/:id", getReadingById);

router.post("/", validateReading, createReading);
router.put("/:id", validateReading, updateReading);
router.delete("/:id", deleteReading);

module.exports = router;
