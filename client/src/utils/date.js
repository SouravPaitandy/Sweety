export const getLocalDateString = (date = new Date()) => {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const normalizeDateInput = (dateValue) => {
  if (!dateValue) return getLocalDateString();
  if (typeof dateValue === "string") {
    if (dateValue.includes("T")) {
      return getLocalDateString(new Date(dateValue));
    }
    return dateValue;
  }
  if (dateValue instanceof Date) {
    return getLocalDateString(dateValue);
  }
  return getLocalDateString();
};

export const formatDisplayDate = (dateString) => {
  if (!dateString) return "";

  // If it's an ISO timestamp or contains time (e.g., '2026-11-23T18:30:00.000Z'),
  // parse it as a full date so local timezone conversion applies:
  if (typeof dateString === "string" && dateString.includes("T")) {
    const parsed = new Date(dateString);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }

  // If it's a YYYY-MM-DD string, construct local date directly:
  if (typeof dateString === "string") {
    const parts = dateString.split("-");
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const parsed = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
      );
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }
    }
  }

  // Fallback for Date objects or other parsable formats
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return "";
};
