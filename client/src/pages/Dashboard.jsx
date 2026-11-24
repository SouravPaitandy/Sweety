import { useCallback, useEffect, useState } from "react";

import { getDailyReport } from "../api/reportApi";
import { createReading } from "../api/readingApi";

import { useAuth } from "../hooks/useAuth";
import { getLocalDateString, formatDisplayDate } from "../utils/date";

import DashboardNavbar from "../components/layout/DashboardNavbar";
import StatCard from "../components/dashboard/StatCard";
import ReadingItem from "../components/dashboard/ReadingItem";

const READING_SLOTS = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

function Dashboard() {
  const { user } = useAuth();

  const today = getLocalDateString();

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    slot: "",
    value: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const response = await getDailyReport(today);
      setReport(response.data);
    } catch (error) {
      setPageError(
        error.response?.data?.message ||
          "Unable to load your dashboard. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const readings = report?.readings || [];
  const summary = report?.summary || {};

  const recordedSlots = readings.map((reading) => reading.slot);

  const availableSlots = READING_SLOTS.filter(
    (slot) => !recordedSlots.includes(slot),
  );

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleAddReading = async (event) => {
    event.preventDefault();
    setFormError("");

    const numericValue = Number(formData.value);

    if (!formData.slot) {
      setFormError("Please select a reading slot.");
      return;
    }

    if (
      !Number.isInteger(numericValue) ||
      numericValue < 40 ||
      numericValue > 600
    ) {
      setFormError("Enter a whole number between 40 and 600.");
      return;
    }

    setIsSubmitting(true);

    try {
      await createReading({
        date: today,
        slot: formData.slot,
        value: numericValue,
      });

      setFormData({
        slot: "",
        value: "",
      });

      setShowForm(false);

      await loadDashboard();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to save this reading. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setFormError("");
    setFormData({ slot: "", value: "" });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <section className="mb-8">
          <p className="text-sm font-medium text-teal-700">{getGreeting()},</p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {user?.name?.split(" ")[0] || "there"}!
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Here's your glucose overview for today.
          </p>

          <p className="mt-1 text-xs text-slate-400">
            {formatDisplayDate(today)}
          </p>
        </section>

        {/* Error state */}
        {pageError && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm text-red-700">{pageError}</p>

            <button
              onClick={loadDashboard}
              className="text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Statistics */}
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Today's overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              A summary of your recorded readings.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Highest reading"
              value={summary.highest ?? "—"}
              unit={summary.highest == null ? "" : "mg/dL"}
              icon="↑"
              description="Highest recorded today"
            />

            <StatCard
              title="Lowest reading"
              value={summary.lowest ?? "—"}
              unit={summary.lowest == null ? "" : "mg/dL"}
              icon="↓"
              description="Lowest recorded today"
            />

            <StatCard
              title="Average reading"
              value={summary.average ?? "—"}
              unit={summary.average == null ? "" : "mg/dL"}
              icon="≈"
              description="Daily average"
            />

            <StatCard
              title="Total readings"
              value={summary.count ?? 0}
              unit="today"
              icon="#"
              description="Recorded glucose readings"
            />
          </div>
        </section>

        {/* Readings and quick action */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Today's readings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Your readings, organized by time slot.
                </p>
              </div>

              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                {readings.length}/4 recorded
              </span>
            </div>

            <div className="mt-5 divide-y divide-slate-100">
              {isLoading ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Loading your readings...
                </p>
              ) : readings.length > 0 ? (
                READING_SLOTS.map((slot) => {
                  const reading = readings.find((item) => item.slot === slot);

                  return (
                    <div key={slot}>
                      {reading ? (
                        <ReadingItem reading={reading} />
                      ) : (
                        <div className="flex items-center justify-between py-4">
                          <p className="text-sm font-medium text-slate-600">
                            {slot}
                          </p>
                          <span className="text-xs text-slate-400">
                            Not recorded
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : pageError ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Readings could not be loaded.
                </p>
              ) : (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                    🩸
                  </div>

                  <h3 className="mt-4 font-semibold text-slate-800">
                    No readings yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                    Your daily reading history will appear here once you record
                    your first glucose reading.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick action card */}
          <aside className="flex flex-col justify-between rounded-2xl bg-teal-800 p-6 text-white shadow-sm">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-2xl">
                +
              </div>

              <h2 className="mt-5 text-xl font-semibold">Track a reading</h2>

              <p className="mt-2 text-sm leading-6 text-teal-100">
                Keep your daily records up to date by adding a glucose reading.
              </p>
            </div>

            <div className="mt-8">
              {availableSlots.length > 0 ? (
                <button
                  onClick={() => setShowForm(true)}
                  disabled={isLoading || Boolean(pageError)}
                  className="w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  + Add today's reading
                </button>
              ) : (
                <div className="rounded-xl bg-white/10 px-4 py-3 text-center text-sm text-teal-100">
                  All four slots are recorded today.
                </div>
              )}

              <p className="mt-3 text-center text-xs text-teal-200">
                One reading per slot, per day.
              </p>
            </div>
          </aside>
        </section>
      </main>

      {/* Add reading modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reading-modal-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="reading-modal-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Add glucose reading
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record a reading for {formatDisplayDate(today)}.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                aria-label="Close dialog"
                className="rounded-lg px-2 py-1 text-xl text-slate-400 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {formError}
              </div>
            )}

            <form onSubmit={handleAddReading} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="slot"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Reading slot
                </label>

                <select
                  id="slot"
                  name="slot"
                  required
                  value={formData.slot}
                  onChange={handleFormChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                >
                  <option value="">Select a slot</option>

                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="value"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Glucose value (mg/dL)
                </label>

                <input
                  id="value"
                  name="value"
                  type="number"
                  min="40"
                  max="600"
                  step="1"
                  required
                  value={formData.value}
                  onChange={handleFormChange}
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
                  onClick={closeForm}
                  disabled={isSubmitting}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || !formData.slot || !formData.value}
                  className="flex-1 rounded-lg bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Saving..." : "Save reading"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
