import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSlots, getTemples } from "../services/slotService";
import Button from "../components/Button";
import Footer from "../components/Footer";
import SlotCard from "../components/SlotCard";
import SlotFilters from "../components/SlotFilters";
import Topbar from "../components/Topbar";
import { useSlotUpdates } from "../hooks/useSlotUpdates";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE = 10;
const ID_PATTERN = /^[a-f\d]{24}$/i;

// Only well-formed values reach the API, so a hand-edited URL cannot trigger a 422 loop.
function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function CalendarIcon() {
  return (
    <svg
      width="27"
      height="27"
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

function AlertIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function StateCard({ icon, title, body, action }) {
  return (
    <div className="state-card">
      <span className="state-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </div>
  );
}

// Placeholder shaped like SlotCard, shown while a request is in flight
function SlotCardSkeleton() {
  return (
    <div className="slot-card" aria-hidden="true">
      <div className="skeleton-block skeleton-date" />
      <div className="slot-main">
        <div className="skeleton-block skeleton-line wide" />
        <div className="skeleton-block skeleton-line" />
        <div className="skeleton-block skeleton-line short" />
      </div>
      <div className="skeleton-block skeleton-price" />
    </div>
  );
}

export default function Slots() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawTempleId = searchParams.get("templeId") ?? "";
  const rawDate = searchParams.get("date") ?? "";
  const templeId = ID_PATTERN.test(rawTempleId) ? rawTempleId : "";
  const date = isValidDate(rawDate) ? rawDate : "";
  const hasFilters = Boolean(templeId || date);

  const [temples, setTemples] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  // Responses are stored with the key they were requested for. Anything whose key no longer
  // matches the current filters is ignored, so a late response never shows as current data.
  const [response, setResponse] = useState({ key: null, slots: [], failed: false });
  const requestKey = `${templeId}|${date}|${retryCount}`;
  const isCurrent = response.key === requestKey;
  // Page is remembered per filter set; changing the filters starts again at page 1
  const filterKey = `${templeId}|${date}`;
  const [pageState, setPageState] = useState({ key: null, page: 1 });

  // Realtime: patch only the matching slot in place. No refetch, and _id keys stay the same.
  useSlotUpdates(({ slotId, availableSeats, status }) => {
    setResponse((prev) => ({
      ...prev,
      slots: prev.slots.map((s) =>
        s._id === slotId ? { ...s, availableSeats, status } : s
      ),
    }));
  });

  // Temples only feed the dropdown; a failure here must not block the slot list.
  useEffect(() => {
    const controller = new AbortController();
    getTemples(controller.signal)
      .then((result) => setTemples(result.data?.temples ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getSlots({ date, templeId }, controller.signal)
      .then((result) => {
        setResponse({ key: requestKey, slots: result.data?.slots ?? [], failed: false });
      })
      .catch(() => {
        // Aborted requests (filters changed or unmount) are expected; their result is dropped.
        if (controller.signal.aborted) return;
        setResponse({ key: requestKey, slots: [], failed: true });
      });
    return () => controller.abort();
  }, [requestKey, date, templeId]);

  const applyFilters = (changes) => {
    const next = { templeId, date, ...changes };
    const params = new URLSearchParams();
    if (next.templeId) params.set("templeId", next.templeId);
    if (next.date) params.set("date", next.date);
    setSearchParams(params);
  };

  const clearFilters = () => applyFilters({ templeId: "", date: "" });
  const retry = () => setRetryCount((count) => count + 1);

  const loading = !isCurrent;
  const slots = isCurrent && !response.failed ? response.slots : [];
  const failed = isCurrent && response.failed;
  const totalPages = Math.max(1, Math.ceil(slots.length / PAGE_SIZE));
  const page = Math.min(pageState.key === filterKey ? pageState.page : 1, totalPages);
  const visibleSlots = slots.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (nextPage) => {
    setPageState({ key: filterKey, page: nextPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  let content;
  if (loading) {
    content = (
      <div className="slot-list slot-grid" aria-busy="true" aria-label="Loading darshan slots">
        {[0, 1, 2].map((item) => (
          <SlotCardSkeleton key={item} />
        ))}
      </div>
    );
  } else if (failed) {
    content = (
      <StateCard
        icon={<AlertIcon />}
        title="We could not load slots"
        body="Please check your connection and try again."
        action={<Button onClick={retry}>Try again</Button>}
      />
    );
  } else if (slots.length === 0) {
    content = (
      <StateCard
        icon={<CalendarIcon />}
        title="No darshan slots found"
        body="Try another date or temple."
        action={
          hasFilters ? (
            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null
        }
      />
    );
  } else {
    content = (
      <div className="slot-list slot-grid">
        {visibleSlots.map((slot) => (
          <SlotCard
            key={slot._id}
            slot={slot}
            footer={
              slot.status === "available" ? (
                <Button onClick={() => navigate(`/book/${slot._id}`)}>Book now</Button>
              ) : undefined
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div className="public-shell">
      <Topbar />
      <main className="slots-main">
        <div className="page-header">
          <div>
            <span className="eyebrow">Darshan slots</span>
            <h1>Find your darshan</h1>
            <p>Explore upcoming darshan slots and choose a time that suits your visit.</p>
          </div>
        </div>
        <SlotFilters
          temples={temples}
          templeId={templeId}
          date={date}
          onTempleChange={(value) => applyFilters({ templeId: value })}
          onDateChange={(value) => applyFilters({ date: value })}
          onClear={clearFilters}
        />
        <div className="list-toolbar">
          <p aria-live="polite">
            {loading ? (
              "Loading darshan slots..."
            ) : failed ? (
              "Slots unavailable"
            ) : (
              <>
                <strong>{slots.length}</strong> {slots.length === 1 ? "darshan slot" : "darshan slots"} found
              </>
            )}
          </p>
        </div>
        {content}
        {!loading && !failed && slots.length > PAGE_SIZE && (
          <nav className="pagination" aria-label="Darshan slot pages">
            <span>
              {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, slots.length)} of {slots.length}
            </span>
            <div>
              <button type="button" aria-label="Previous page" disabled={page === 1} onClick={() => goToPage(page - 1)}>
                ‹
              </button>
              <span>
                Page {page} of {totalPages}
              </span>
              <button type="button" aria-label="Next page" disabled={page === totalPages} onClick={() => goToPage(page + 1)}>
                ›
              </button>
            </div>
          </nav>
        )}
      </main>
      <Footer />
    </div>
  );
}
