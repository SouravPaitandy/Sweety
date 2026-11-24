const VALID_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

// Get today's date in the application's timezone.
// Defaults to India time; can be configured in .env.
const getTodayDate = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: process.env.APP_TIME_ZONE || "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
};

// Strictly validate YYYY-MM-DD and actual calendar dates.
const isValidDate = (date) => {
  if (typeof date !== "string") return false;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (!match) return false;

  const [, year, month, day] = match;
  const parsedDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day)),
  );

  return (
    parsedDate.getUTCFullYear() === Number(year) &&
    parsedDate.getUTCMonth() === Number(month) - 1 &&
    parsedDate.getUTCDate() === Number(day)
  );
};

const validateReading = (req, res, next) => {
  const { date, slot, value } = req.body || {};
  const errors = {};

  // Validate date.
  if (!date) {
    errors.date = "Reading date is required.";
  } else if (!isValidDate(date)) {
    errors.date = "Please provide a valid date in YYYY-MM-DD format.";
  } else if (date > getTodayDate()) {
    errors.date = "Future dates are not allowed.";
  }

  // Validate slot.
  if (!slot) {
    errors.slot = "Reading slot is required.";
  } else if (!VALID_SLOTS.includes(slot)) {
    errors.slot = "Please select a valid reading slot.";
  }

  // Validate glucose value.
  if (value === undefined || value === null || value === "") {
    errors.value = "Glucose value is required.";
  } else if (!Number.isInteger(value)) {
    errors.value = "Glucose value must be a whole number.";
  } else if (value < 40 || value > 600) {
    errors.value = "Glucose value must be between 40 and 600 mg/dL.";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors,
    });
  }

  next();
};

module.exports = {
  validateReading,
  isValidDate,
  getTodayDate,
};
