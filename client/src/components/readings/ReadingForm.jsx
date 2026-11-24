import { useState } from "react";
import { getLocalDateString, normalizeDateInput } from "../../utils/date";

const READING_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

function ReadingForm({ initialData, onSubmit, onCancel, isSubmitting, error }) {
  const [formData, setFormData] = useState({
    date: initialData?.date
      ? normalizeDateInput(initialData.date)
      : getLocalDateString(),
    slot: initialData?.slot || "",
    value: initialData?.value?.toString() || "",
  });

  const [validationError, setValidationError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setValidationError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setValidationError("");

    if (!formData.date || !formData.slot || formData.value === "") {
      setValidationError("Please complete all fields.");
      return;
    }

    const numericValue = Number(formData.value);

    if (
      !Number.isInteger(numericValue) ||
      numericValue < 40 ||
      numericValue > 600
    ) {
      setValidationError("Enter a whole number between 40 and 600.");
      return;
    }

    if (formData.date > getLocalDateString()) {
      setValidationError("Future dates are not allowed.");
      return;
    }

    onSubmit({
      date: formData.date,
      slot: formData.slot,
      value: numericValue,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {(validationError || error) && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {validationError || error}
        </div>
      )}

      <div>
        <label
          htmlFor="reading-date"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Reading date
        </label>

        <input
          id="reading-date"
          name="date"
          type="date"
          required
          max={getLocalDateString()}
          value={formData.date}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label
          htmlFor="reading-slot"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Reading slot
        </label>

        <select
          id="reading-slot"
          name="slot"
          required
          value={formData.slot}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        >
          <option value="">Select a slot</option>

          {READING_SLOTS.map((slot) => (
            <option key={slot} value={slot}>
              {slot}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="reading-value"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Glucose value (mg/dL)
        </label>

        <input
          id="reading-value"
          name="value"
          type="number"
          min="40"
          max="600"
          step="1"
          required
          value={formData.value}
          onChange={handleChange}
          placeholder="e.g. 110"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
        />

        <p className="mt-2 text-xs text-slate-400">
          Enter a whole number between 40 and 600.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Save changes"
              : "Add reading"}
        </button>
      </div>
    </form>
  );
}

export default ReadingForm;
