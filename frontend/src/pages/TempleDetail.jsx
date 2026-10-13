import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTempleById } from "../services/slotService";
import Button from "../components/Button";
import Footer from "../components/Footer";
import SlotCard from "../components/SlotCard";
import TempleMap from "../components/TempleMap";
import Topbar from "../components/Topbar";
import { useSlotUpdates } from "../hooks/useSlotUpdates";
import { formatTimeRange } from "../utils/format";
import { fitDescription } from "../utils/meta";

// Use the temple image only when it is a valid https URL. Anything else falls back to the CSS default.
const safeImageStyle = (imageUrl) => {
  if (!imageUrl) return undefined;
  try {
    const url = new URL(imageUrl);
    return url.protocol === "https:" ? { backgroundImage: `url("${url.href}")` } : undefined;
  } catch {
    return undefined;
  }
};

function ArrowLeftIcon() {
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
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function TempleDetail() {
  const { id: templeId } = useParams();
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);

  // Same pattern as Slots: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, data: null, failure: null });
  const requestKey = `${templeId}|${retryCount}`;
  const isCurrent = request.key === requestKey;
  const data = isCurrent ? request.data : null;
  const failure = isCurrent ? request.failure : null;

  // Realtime: patch only the matching slot in place, without refetching
  useSlotUpdates(({ slotId, availableSeats, status }) => {
    setRequest((prev) =>
      prev.key === requestKey && prev.data
        ? {
            ...prev,
            data: {
              ...prev.data,
              slots: prev.data.slots.map((s) =>
                s._id === slotId ? { ...s, availableSeats, status } : s
              ),
            },
          }
        : prev
    );
  });

  useEffect(() => {
    const controller = new AbortController();
    getTempleById(templeId, controller.signal)
      .then((result) => setRequest({ key: requestKey, data: result.data, failure: null }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        const status = err.response?.status;
        const kind = status === 404 || status === 422 ? "notfound" : "error";
        setRequest({ key: requestKey, data: null, failure: kind });
      });
    return () => controller.abort();
  }, [requestKey, templeId]);

  let body;
  if (!isCurrent) {
    body = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading temple</h2>
        <p>Fetching temple details and upcoming slots.</p>
      </div>
    );
  } else if (failure === "notfound") {
    body = (
      <div className="state-card">
        <h2>Temple not found</h2>
        <p>This temple does not exist or has been removed.</p>
        <Button onClick={() => navigate("/slots")}>Back to slots</Button>
      </div>
    );
  } else if (failure === "error") {
    body = (
      <div className="state-card">
        <h2>We could not load this temple</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else {
    const { temple, slots } = data;
    // Coordinates are optional on the server (null until seeded or entered by an organizer)
    const hasCoordinates =
      Number.isFinite(temple.latitude) &&
      Number.isFinite(temple.longitude) &&
      Math.abs(temple.latitude) <= 90 &&
      Math.abs(temple.longitude) <= 180;

    const slotsSection = (
      <>
        <div className="section-title">
          <h2>Upcoming darshan slots</h2>
        </div>
        {slots.length === 0 ? (
          <div className="state-card">
            <h2>No upcoming slots for this temple</h2>
            <p>Check back later for new darshan slots.</p>
          </div>
        ) : (
          <div className="slot-list">
            {slots.map((slot, index) => (
              <SlotCard
                key={slot._id}
                index={index}
                slot={slot}
                footer={
                  slot.status === "available" ? (
                    <Button onClick={() => navigate(`/book/${slot._id}`)}>Book now</Button>
                  ) : undefined
                }
              />
            ))}
          </div>
        )}
        <p>
          <Link className="text-link" to={`/slots?templeId=${temple._id}`}>
            View all slots for this temple
          </Link>
        </p>
      </>
    );

    body = (
      <>
        <section className="temple-hero">
          <div
            className="temple-photo"
            role="img"
            aria-label={temple.templeName}
            style={safeImageStyle(temple.imageUrl)}
          />
          <div className="temple-summary">
            <span className="eyebrow">Temple</span>
            <h1>{temple.templeName}</h1>
            {temple.description && <p>{temple.description}</p>}
            <div className="temple-facts">
              <div>
                <MapPinIcon />
                <span>
                  <small>Location</small>
                  <strong>{temple.location}</strong>
                </span>
              </div>
              <div>
                <ClockIcon />
                <span>
                  <small>Darshan hours</small>
                  <strong>
                    {formatTimeRange(temple.darshanStartTime, temple.darshanEndTime)}
                  </strong>
                </span>
              </div>
            </div>
            {temple.offerings.length > 0 && (
              <>
                <small>Darshan offerings</small>
                <div className="offering-row">
                  {temple.offerings.map((offering) => (
                    <span key={offering}>{offering}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {hasCoordinates ? (
          <div className="temple-content">
            <div>{slotsSection}</div>
            <aside className="map-card">
              <TempleMap
                latitude={temple.latitude}
                longitude={temple.longitude}
                name={temple.templeName}
              />
              <h3>{temple.templeName}</h3>
              <p>{temple.location}</p>
              <a
                className="text-link"
                href={`https://www.openstreetmap.org/?mlat=${temple.latitude}&mlon=${temple.longitude}#map=15/${temple.latitude}/${temple.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in OpenStreetMap
              </a>
            </aside>
          </div>
        ) : (
          slotsSection
        )}
      </>
    );
  }

  const templeInfo = data?.temple;
  const pageTitle = templeInfo ? `${templeInfo.templeName} | DarshanEase` : "Temple | DarshanEase";
  const pageDescription = fitDescription(
    templeInfo
      ? `${templeInfo.templeName} in ${templeInfo.location}: darshan hours, offerings and upcoming darshan slots. Choose a time and book your visit online.`
      : "Temple details, darshan hours, offerings and upcoming darshan slots. Choose a time and book your visit online with DarshanEase."
  );

  return (
    <div className="public-shell">
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <Topbar />
      <main className="slots-main">
        <button className="back-link" type="button" onClick={() => navigate("/slots")}>
          <ArrowLeftIcon />
          Back to slots
        </button>
        {body}
      </main>
      <Footer />
    </div>
  );
}
