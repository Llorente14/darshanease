import Button from "./Button";

// Today as "YYYY-MM-DD" in local time. Built from parts, not toISOString(), which is UTC.
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function CalendarIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4" />
      <path d="M8 2v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

// Controlled filter bar. Values come from the parent (URL params); changes go back via handlers.
// `templeId` is "" for "All temples". `date` is "" when no date is chosen.
export default function SlotFilters({
  temples = [],
  templeId = "",
  date = "",
  onTempleChange,
  onDateChange,
  onClear,
}) {
  const hasFilters = Boolean(templeId || date);

  return (
    <div className="filter-panel slot-filters">
      <label htmlFor="slot-filter-temple">
        <span>Temple</span>
        <select
          id="slot-filter-temple"
          name="templeId"
          value={templeId}
          onChange={(event) => onTempleChange(event.target.value)}
        >
          <option value="">All temples</option>
          {temples.map((temple) => (
            <option key={temple._id} value={temple._id}>
              {temple.templeName}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="slot-filter-date">
        <span>Date</span>
        <div>
          <CalendarIcon />
          <input
            id="slot-filter-date"
            name="date"
            type="date"
            min={todayString()}
            value={date}
            onChange={(event) => onDateChange(event.target.value)}
          />
        </div>
      </label>
      {hasFilters && (
        <Button variant="secondary" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
