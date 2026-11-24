import { useCallback, useEffect, useState } from "react";

import {
  getReadings,
  createReading,
  updateReading,
  deleteReading,
} from "../api/readingApi";

import { formatDisplayDate, getLocalDateString } from "../utils/date";
import ReadingForm from "../components/readings/ReadingForm";
import DashboardNavbar from "../components/layout/DashboardNavbar";

const SLOT_ORDER = [
  "Morning",
  "After breakfast",
  "After lunch",
  "After dinner",
];

function Readings() {
  const [selectedDate, setSelectedDate] = useState("");
  const [readings, setReadings] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const loadReadings = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      const params = selectedDate ? { date: selectedDate } : {};
      const response = await getReadings(params);

      setReadings(response.data.readings || []);
    } catch (error) {
      setPageError(
        error.response?.data?.message ||
          "Unable to load readings. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const openAddForm = () => {
    setEditingReading(null);
    setFormError("");
    setActionMessage("");
    setShowForm(true);
  };

  const openEditForm = (reading) => {
    setEditingReading(reading);
    setFormError("");
    setActionMessage("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingReading(null);
    setFormError("");
  };

  const handleSaveReading = async (readingData) => {
    setIsSubmitting(true);
    setFormError("");

    try {
      if (editingReading) {
        await updateReading(editingReading.id, readingData);
        setActionMessage("Reading updated successfully.");
      } else {
        await createReading(readingData);
        setActionMessage("Reading added successfully.");
      }

      closeForm();
      await loadReadings();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          "Unable to save reading. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReading = async (reading) => {
    const confirmed = window.confirm(
      `Delete the ${reading.slot} reading from ${formatDisplayDate(reading.date)}?`,
    );

    if (!confirmed) return;

    setActionMessage("");
    setPageError("");

    try {
      await deleteReading(reading.id);
      setActionMessage("Reading deleted successfully.");
      await loadReadings();
    } catch (error) {
      setPageError(
        error.response?.data?.message ||
          "Unable to delete reading. Please try again.",
      );
    }
  };

  const sortedReadings = [...readings].sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);

    if (dateComparison !== 0) return dateComparison;

    return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page heading */}
        <section className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal-700">
              Your health records
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
              Reading History
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View and manage your recorded glucose readings.
            </p>
          </div>

          <button
            onClick={openAddForm}
            className="rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            + Add reading
          </button>
        </section>

        {/* Date filter */}
        <section className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex-1">
            <label
              htmlFor="date-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Filter by date
            </label>

            <input
              id="date-filter"
              type="date"
              max={getLocalDateString()}
              value={selectedDate}
              onChange={(event) => {
                setSelectedDate(event.target.value);
                setActionMessage("");
              }}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 sm:max-w-xs"
            />
          </div>

          <button
            onClick={() => {
              setSelectedDate("");
              setActionMessage("");
            }}
            disabled={!selectedDate}
            className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear filter
          </button>
        </section>

        {/* Feedback messages */}
        {actionMessage && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800"
          >
            {actionMessage}
          </div>
        )}

        {pageError && (
          <div
            role="alert"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {pageError}

            <button onClick={loadReadings} className="font-semibold underline">
              Retry
            </button>
          </div>
        )}

        {/* Readings list */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">
                {selectedDate
                  ? `Readings for ${formatDisplayDate(selectedDate)}`
                  : "All readings"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? "Loading records..."
                  : `${readings.length} ${readings.length === 1 ? "reading" : "readings"} found`}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Loading your reading history...
            </div>
          ) : sortedReadings.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {sortedReadings.map((reading) => (
                <div
                  key={reading.id}
                  className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 transition hover:bg-slate-50 sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg">
                      🩸
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800">
                        {reading.slot}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {formatDisplayDate(reading.date)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <p className="text-right text-lg font-bold text-slate-900">
                      {reading.value}
                      <span className="ml-1 text-xs font-medium text-slate-400">
                        mg/dL
                      </span>
                    </p>

                    <button
                      onClick={() => openEditForm(reading)}
                      aria-label={`Edit ${reading.slot} reading`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-teal-50 hover:text-teal-700"
                    >
                      <span aria-hidden="true">✎</span>
                    </button>

                    <button
                      onClick={() => handleDeleteReading(reading)}
                      aria-label={`Delete ${reading.slot} reading`}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                🗂️
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                No readings found
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                {selectedDate
                  ? "There are no readings recorded for this date. Try another date or add a reading."
                  : "Your glucose history will appear here once you add your first reading."}
              </p>

              <button
                onClick={openAddForm}
                className="mt-5 rounded-lg bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
              >
                Add a reading
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Add/Edit reading modal */}
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
            aria-labelledby="reading-form-title"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-6">
              <h2
                id="reading-form-title"
                className="text-xl font-bold text-slate-900"
              >
                {editingReading ? "Edit reading" : "Add reading"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {editingReading
                  ? "Update the details of this reading."
                  : "Enter the details of your glucose reading."}
              </p>
            </div>

            <ReadingForm
              key={editingReading?.id || "new-reading"}
              initialData={editingReading}
              onSubmit={handleSaveReading}
              onCancel={closeForm}
              isSubmitting={isSubmitting}
              error={formError}
            />
          </section>
        </div>
      )}
    </div>
  );
}

export default Readings;
