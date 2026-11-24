const SLOT_DETAILS = {
  Morning: {
    icon: "☀️",
    description: "Morning reading",
  },
  "After breakfast": {
    icon: "🍳",
    description: "Post-breakfast reading",
  },
  "After lunch": {
    icon: "🥗",
    description: "Post-lunch reading",
  },
  "After dinner": {
    icon: "🌙",
    description: "Post-dinner reading",
  },
};

function ReadingItem({ reading }) {
  const details = SLOT_DETAILS[reading.slot];

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
          {details?.icon || "🩸"}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {reading.slot}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {details?.description || "Glucose reading"}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-lg font-bold text-slate-900">
          {reading.value}
          <span className="ml-1 text-xs font-medium text-slate-400">mg/dL</span>
        </p>
      </div>
    </div>
  );
}

export default ReadingItem;
