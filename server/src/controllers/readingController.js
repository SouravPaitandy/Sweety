const pool = require("../config/database");

const READING_SELECT = `
  SELECT
    id,
    reading_date AS date,
    slot,
    glucose_value AS value,
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM readings
`;

// Validate a PostgreSQL BIGSERIAL ID without converting it to a JS Number.
const isValidId = (id) => {
  if (typeof id !== "string" || !/^[1-9]\d*$/.test(id)) {
    return false;
  }

  return BigInt(id) <= 9223372036854775807n;
};

// GET /api/readings
const getReadings = async (req, res) => {
  try {
    const { date } = req.query;

    if (date !== undefined) {
      const { isValidDate } = require("../validators/readingValidator");

      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date filter. Use YYYY-MM-DD.",
        });
      }
    }

    let query = READING_SELECT + " WHERE user_id = $1";
    const params = [req.user.id];

    if (date !== undefined) {
      params.push(date);
      query += " AND reading_date = $2";
    }

    query += `
      ORDER BY
        reading_date DESC,
        CASE slot
          WHEN 'Morning' THEN 1
          WHEN 'After breakfast' THEN 2
          WHEN 'After lunch' THEN 3
          WHEN 'After dinner' THEN 4
        END ASC
    `;

    const result = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      data: {
        readings: result.rows,
      },
    });
  } catch (error) {
    console.error("Get readings error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve readings.",
    });
  }
};

// GET /api/readings/:id
const getReadingById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reading ID.",
      });
    }

    const result = await pool.query(
      `${READING_SELECT}
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        reading: result.rows[0],
      },
    });
  } catch (error) {
    console.error("Get reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve reading.",
    });
  }
};

// POST /api/readings
const createReading = async (req, res) => {
  try {
    const { date, slot, value } = req.body;

    // Check maximum four readings per day limit for the authenticated user
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM readings
       WHERE user_id = $1 AND reading_date = $2`,
      [req.user.id, date],
    );

    if (countResult.rows[0].count >= 4) {
      return res.status(400).json({
        success: false,
        message: "You can add only 4 readings per day.",
      });
    }

    const result = await pool.query(
      `INSERT INTO readings
        (user_id, reading_date, slot, glucose_value)
       VALUES ($1, $2, $3, $4)
       RETURNING
         id,
         reading_date AS date,
         slot,
         glucose_value AS value,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [req.user.id, date, slot, value],
    );

    return res.status(201).json({
      success: true,
      message: "Reading created successfully.",
      data: {
        reading: result.rows[0],
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A reading already exists for this slot and date.",
      });
    }

    console.error("Create reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to create reading.",
    });
  }
};

// PUT /api/readings/:id
const updateReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, slot, value } = req.body;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reading ID.",
      });
    }

    // Check if the reading exists and belongs to the authenticated user
    const existingResult = await pool.query(
      `SELECT id, reading_date AS date
       FROM readings
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id],
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found.",
      });
    }

    const existingReading = existingResult.rows[0];

    // If moving reading to another date, enforce maximum four readings limit on the target date
    if (existingReading.date !== date) {
      const targetCountResult = await pool.query(
        `SELECT COUNT(*)::int AS count
         FROM readings
         WHERE user_id = $1 AND reading_date = $2`,
        [req.user.id, date],
      );

      if (targetCountResult.rows[0].count >= 4) {
        return res.status(400).json({
          success: false,
          message: "You can add only 4 readings per day.",
        });
      }
    }

    const result = await pool.query(
      `UPDATE readings
       SET
         reading_date = $1,
         slot = $2,
         glucose_value = $3,
         updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING
         id,
         reading_date AS date,
         slot,
         glucose_value AS value,
         created_at AS "createdAt",
         updated_at AS "updatedAt"`,
      [date, slot, value, id, req.user.id],
    );

    return res.status(200).json({
      success: true,
      message: "Reading updated successfully.",
      data: {
        reading: result.rows[0],
      },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "A reading already exists for this slot and date.",
      });
    }

    console.error("Update reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to update reading.",
    });
  }
};

// DELETE /api/readings/:id
const deleteReading = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reading ID.",
      });
    }

    const result = await pool.query(
      `DELETE FROM readings
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Reading not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Reading deleted successfully.",
    });
  } catch (error) {
    console.error("Delete reading error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to delete reading.",
    });
  }
};

module.exports = {
  getReadings,
  getReadingById,
  createReading,
  updateReading,
  deleteReading,
};
