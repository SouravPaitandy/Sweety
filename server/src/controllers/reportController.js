const pool = require("../config/database");
const { isValidDate, getTodayDate } = require("../validators/readingValidator");

// Format a JavaScript Date as YYYY-MM-DD using UTC.
const formatDate = (date) => date.toISOString().slice(0, 10);

// Calculate the requested report's date range.
const getReportDateRange = (reportType, selectedDate) => {
  const anchor = new Date(`${selectedDate}T00:00:00.000Z`);

  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth();

  if (reportType === "daily") {
    return {
      startDate: selectedDate,
      endDate: selectedDate,
    };
  }

  if (reportType === "month-to-date") {
    return {
      startDate: formatDate(new Date(Date.UTC(year, month, 1))),
      endDate: selectedDate,
    };
  }

  if (reportType === "monthly") {
    // First day of the selected month.
    const currentMonthStart = new Date(Date.UTC(year, month, 1));

    // Last day of the previous month.
    const previousMonthEnd = new Date(
      currentMonthStart.getTime() - 24 * 60 * 60 * 1000,
    );

    // First day of the previous month.
    const previousMonthStart = new Date(Date.UTC(year, month - 1, 1));

    return {
      startDate: formatDate(previousMonthStart),
      endDate: formatDate(previousMonthEnd),
    };
  }

  throw new Error("Unsupported report type.");
};

// Shared report handler.
const generateReport = (reportType) => async (req, res) => {
  try {
    const selectedDate = req.query.date || getTodayDate();

    // Validate selected date.
    if (!isValidDate(selectedDate)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date in YYYY-MM-DD format.",
      });
    }

    if (selectedDate > getTodayDate()) {
      return res.status(400).json({
        success: false,
        message: "Future dates are not allowed.",
      });
    }

    const { startDate, endDate } = getReportDateRange(reportType, selectedDate);

    // 1. Calculate summary statistics.
    const summaryResult = await pool.query(
      `SELECT
         MAX(glucose_value)::int AS highest,
         MIN(glucose_value)::int AS lowest,
         ROUND(AVG(glucose_value)::numeric, 1) AS average,
         COUNT(*)::int AS count
       FROM readings
       WHERE user_id = $1
         AND reading_date >= $2::date
         AND reading_date <= $3::date`,
      [req.user.id, startDate, endDate],
    );

    const summary = summaryResult.rows[0];

    // 2. Fetch individual readings for the daily report.
    let readings = [];

    if (reportType === "daily") {
      const readingsResult = await pool.query(
        `SELECT
           id,
           reading_date AS date,
           slot,
           glucose_value AS value
         FROM readings
         WHERE user_id = $1
           AND reading_date = $2::date
         ORDER BY
           CASE slot
             WHEN 'Morning' THEN 1
             WHEN 'After breakfast' THEN 2
             WHEN 'After lunch' THEN 3
             WHEN 'After dinner' THEN 4
           END ASC`,
        [req.user.id, selectedDate],
      );

      readings = readingsResult.rows;
    }

    return res.status(200).json({
      success: true,
      data: {
        reportType,
        period: {
          startDate,
          endDate,
        },
        summary,
        readings,
      },
    });
  } catch (error) {
    console.error(`${reportType} report error:`, error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to generate report.",
    });
  }
};

module.exports = {
  getDailyReport: generateReport("daily"),
  getMonthToDateReport: generateReport("month-to-date"),
  getMonthlyReport: generateReport("monthly"),
};
