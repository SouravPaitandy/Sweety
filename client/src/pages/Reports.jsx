import { useCallback, useEffect, useState } from "react";

import {
  getDailyReport,
  getMonthToDateReport,
  getMonthlyReport,
} from "../api/reportApi";

import { getLocalDateString, formatDisplayDate } from "../utils/date";

import DashboardNavbar from "../components/layout/DashboardNavbar";
import StatCard from "../components/dashboard/StatCard";
import ReadingItem from "../components/dashboard/ReadingItem";

const REPORT_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "month-to-date", label: "Month to date" },
  { value: "monthly", label: "Previous month" },
];

const REPORT_FETCHERS = {
  daily: getDailyReport,
  "month-to-date": getMonthToDateReport,
  monthly: getMonthlyReport,
};

function Reports() {
  const [reportType, setReportType] = useState("daily");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const fetchReport = REPORT_FETCHERS[reportType];
      const response = await fetchReport(selectedDate);

      setReport(response.data);
    } catch (err) {
      setReport(null);
      setError(
        err.response?.data?.message ||
          "Unable to generate this report. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [reportType, selectedDate]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const summary = report?.summary || {};
  const readings = report?.readings || [];
  const hasReadings = Number(summary.count) > 0;

  const getReportDescription = () => {
    if (!report?.period) return "";

    const { startDate, endDate } = report.period;

    if (startDate === endDate) {
      return formatDisplayDate(startDate);
    }

    return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardNavbar />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Heading */}
        <section className="mb-8">
          <p className="text-sm font-medium text-teal-700">
            Your glucose insights
          </p>

          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Reports
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Review your glucose readings across different time periods.
          </p>
        </section>

        {/* Report controls */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="font-semibold text-slate-900">
              Select report period
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the type of report and its reference date.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {REPORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setReportType(option.value)}
                className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                  reportType === option.value
                    ? "bg-teal-700 text-white"
                    : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-5 max-w-xs">
            <label
              htmlFor="report-date"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Reference date
            </label>

            <input
              id="report-date"
              type="date"
              max={getLocalDateString()}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </section>

        {/* Report heading */}
        <section className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {reportType === "daily"
                ? "Daily report"
                : reportType === "month-to-date"
                  ? "Month-to-date report"
                  : "Previous month report"}
            </h2>

            {report && (
              <p className="mt-1 text-sm text-slate-500">
                {getReportDescription()}
              </p>
            )}
          </div>

          <button
            onClick={loadReport}
            disabled={isLoading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isLoading ? "Refreshing..." : "↻ Refresh"}
          </button>
        </section>

        {/* Error state */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm text-red-700">{error}</p>

            <button
              onClick={loadReport}
              className="text-sm font-semibold text-red-700 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Summary statistics */}
        <section className="mb-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Highest reading"
              value={summary.highest ?? "—"}
              unit={summary.highest == null ? "" : "mg/dL"}
              icon="↑"
              description="Highest recorded in this period"
            />

            <StatCard
              title="Lowest reading"
              value={summary.lowest ?? "—"}
              unit={summary.lowest == null ? "" : "mg/dL"}
              icon="↓"
              description="Lowest recorded in this period"
            />

            <StatCard
              title="Average reading"
              value={summary.average ?? "—"}
              unit={summary.average == null ? "" : "mg/dL"}
              icon="≈"
              description="Average for this period"
            />

            <StatCard
              title="Total readings"
              value={summary.count ?? 0}
              unit="readings"
              icon="#"
              description="Number of recorded readings"
            />
          </div>
        </section>

        {/* Report content */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="font-semibold text-slate-900">
              {reportType === "daily"
                ? "Individual readings"
                : "Period summary"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {reportType === "daily"
                ? "Glucose readings recorded on the selected date."
                : "Aggregated statistics for the selected reporting period."}
            </p>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400">
              Generating your report...
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Report data is unavailable.
            </div>
          ) : !hasReadings ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl">
                📊
              </div>

              <h3 className="mt-4 font-semibold text-slate-800">
                No readings for this period
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                Once you record glucose readings, your statistics and report
                details will appear here.
              </p>
            </div>
          ) : reportType === "daily" ? (
            <div className="divide-y divide-slate-100 px-5 sm:px-6">
              {readings.map((reading) => (
                <ReadingItem key={reading.id} reading={reading} />
              ))}
            </div>
          ) : (
            <div className="px-5 py-8 sm:px-6">
              <div className="rounded-xl bg-teal-50 p-5">
                <p className="text-sm font-medium text-teal-800">
                  Reporting period
                </p>

                <p className="mt-2 text-xl font-bold text-teal-900">
                  {getReportDescription()}
                </p>

                <p className="mt-2 text-sm text-teal-700">
                  {summary.count} readings were recorded during this period.
                </p>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                These statistics summarize all glucose readings recorded between
                the dates shown above. Individual readings are available in the
                Daily report.
              </p>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Reports are summaries of recorded data and are not medical diagnoses
          or treatment recommendations.
        </p>
      </main>
    </div>
  );
}

export default Reports;
