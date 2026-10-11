import { useEffect, useRef, useState } from "react";
import {
  createMySlot,
  deleteMySlot,
  getMySlots,
  getSlotBookings,
  updateMySlot,
} from "../services/organizerService";
import Button from "./Button";
import { formatPrice, formatSlotDate, formatTimeRange } from "../utils/format";

const EMPTY_FORM = {
  templeId: "",
  date: "",
  startTime: "",
  endTime: "",
  availableSeats: "",
  price: "",
};

const SLOT_STATUS = {
  available: { label: "Available", tone: "status-success" },
  full: { label: "Full", tone: "status-warning" },
  expired: { label: "Expired", tone: "status-neutral" },
};

// Same labels and tones as the booking history page
const BOOKING_STATUS = {
  confirmed: { label: "Confirmed", tone: "status-success" },
  pending: { label: "Pending", tone: "status-warning" },
  cancelled: { label: "Cancelled", tone: "status-danger" },
  failed: { label: "Failed", tone: "status-danger" },
};

const slotStatus = (status) =>
  SLOT_STATUS[status] ?? { label: String(status ?? "Unknown"), tone: "status-neutral" };

const bookingStatus = (status) =>
  BOOKING_STATUS[status] ?? { label: String(status ?? "Unknown"), tone: "status-neutral" };

// Local calendar date, used as the minimum for the date input
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// Empty input stays as typed so the server rejects it with a 422. Numbers are sent as numbers.
const toNumber = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return trimmed;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : trimmed;
};

// Fields that both create and update send. templeId is added only on create.
const toSlotBody = (form) => ({
  date: form.date.trim(),
  startTime: form.startTime.trim(),
  endTime: form.endTime.trim(),
  availableSeats: toNumber(form.availableSeats),
  price: toNumber(form.price),
});

const mapFieldErrors = (errors = []) =>
  Object.fromEntries(errors.map((item) => [item.field.split(/[[.]/)[0], item.message]));

const toForm = (slot) => ({
  templeId: slot.temple._id,
  date: slot.date,
  startTime: slot.startTime,
  endTime: slot.endTime,
  availableSeats: String(slot.availableSeats),
  price: String(slot.price),
});

const slotLine = (slot) =>
  [
    slot.temple.templeName,
    formatSlotDate(slot.date),
    formatTimeRange(slot.startTime, slot.endTime),
  ].join(" · ");

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

function IconSvg({ children }) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function PencilIcon() {
  return (
    <IconSvg>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </IconSvg>
  );
}

function ListIcon() {
  return (
    <IconSvg>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </IconSvg>
  );
}

function TrashIcon() {
  return (
    <IconSvg>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 14h10l1-14" />
    </IconSvg>
  );
}

// Label + input in the same markup as FormInput, with support for min and disabled
function SlotField({ label, name, error, ...inputProps }) {
  const id = `slot-${name}`;
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} aria-invalid={error ? "true" : undefined} {...inputProps} />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

export default function OrganizerSlotsPanel({ temples }) {
  const [filterTempleId, setFilterTempleId] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [notice, setNotice] = useState("");

  // Same pattern as MyBookings: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, data: null, failed: false });
  const requestKey = `${filterTempleId}|${retryCount}`;
  const isCurrent = request.key === requestKey;
  const loading = !isCurrent;
  const failed = isCurrent && request.failed;
  const slots = isCurrent && request.data ? request.data.slots : [];

  // Form state: editingSlot is null in create mode and the slot being edited otherwise
  const [editingSlot, setEditingSlot] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  // One dialog at a time: { type: "delete" | "bookings", slot } or null
  const [dialog, setDialog] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [bookingsRetry, setBookingsRetry] = useState(0);
  const bookingsKey = dialog?.type === "bookings" ? `${dialog.slot._id}|${bookingsRetry}` : null;
  const [bookingsRequest, setBookingsRequest] = useState({ key: null, data: null, failed: false });
  const bookingsCurrent = bookingsKey !== null && bookingsRequest.key === bookingsKey;
  const bookingsLoading = bookingsKey !== null && !bookingsCurrent;
  const bookingsFailed = bookingsCurrent && bookingsRequest.failed;
  const bookingsData = bookingsCurrent && bookingsRequest.data ? bookingsRequest.data : null;

  useEffect(() => {
    const controller = new AbortController();
    getMySlots({ templeId: filterTempleId || undefined }, controller.signal)
      .then((result) => setRequest({ key: requestKey, data: result.data, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequest({ key: requestKey, data: null, failed: true });
      });
    return () => controller.abort();
  }, [requestKey, filterTempleId]);

  useEffect(() => {
    if (!bookingsKey) return undefined;
    const controller = new AbortController();
    const slotId = bookingsKey.split("|")[0];
    getSlotBookings(slotId, controller.signal)
      .then((result) => setBookingsRequest({ key: bookingsKey, data: result.data, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setBookingsRequest({ key: bookingsKey, data: null, failed: true });
      });
    return () => controller.abort();
  }, [bookingsKey]);

  // Escape closes the dialog, except while a delete is in flight
  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) {
        setDialog(null);
        setDialogError("");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, deleting]);

  const setField = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const resetForm = () => {
    setEditingSlot(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
  };

  const startEdit = (slot) => {
    setNotice("");
    setEditingSlot(slot);
    setForm(toForm(slot));
    setFieldErrors({});
    setFormError("");
    formRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    setFieldErrors({});
    setNotice("");
    try {
      if (editingSlot) {
        // No templeId on update: a slot cannot move to another temple
        await updateMySlot(editingSlot._id, toSlotBody(form));
        setNotice("Slot updated.");
      } else {
        await createMySlot({ templeId: form.templeId, ...toSlotBody(form) });
        setNotice("Slot created.");
      }
      resetForm();
      setRetryCount((count) => count + 1);
    } catch (err) {
      const data = err.response?.data;
      setFormError(data?.message || "Something went wrong. Please try again.");
      setFieldErrors(mapFieldErrors(data?.errors));
    } finally {
      setSaving(false);
    }
  };

  const openDialog = (next) => {
    setNotice("");
    setDialogError("");
    if (next.type === "bookings") setBookingsRetry(0);
    setDialog(next);
  };

  const closeDialog = () => {
    if (deleting) return;
    setDialog(null);
    setDialogError("");
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setDialogError("");
    try {
      const id = dialog.slot._id;
      await deleteMySlot(id);
      if (editingSlot?._id === id) resetForm();
      setDialog(null);
      setNotice("Slot deleted.");
      setRetryCount((count) => count + 1);
    } catch (err) {
      // 409 means the slot has bookings. The server message stays in the dialog.
      setDialogError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  if (temples.length === 0) {
    return (
      <div className="state-card">
        <h2>Create a temple first</h2>
        <p>Slots belong to one of your temples.</p>
      </div>
    );
  }

  const isEditing = editingSlot !== null;
  // Once a slot has active bookings, only availableSeats can change
  const locked = isEditing && editingSlot.activeBookings > 0;

  let listBody;
  if (loading) {
    listBody = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading slots</h2>
        <p>Fetching your upcoming darshan slots.</p>
      </div>
    );
  } else if (failed) {
    listBody = (
      <div className="state-card">
        <h2>We could not load your slots</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else if (slots.length === 0) {
    listBody = (
      <div className="state-card">
        <h2>No upcoming slots</h2>
        <p>Use the form to add a darshan slot for one of your temples.</p>
      </div>
    );
  } else {
    listBody = (
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Temple</th>
              <th>Seats left</th>
              <th>Booked</th>
              <th>Price</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => {
              const badge = slotStatus(slot.status);
              const label = `${formatSlotDate(slot.date)} ${slot.startTime}`;
              return (
                <tr key={slot._id}>
                  <td>{formatSlotDate(slot.date)}</td>
                  <td>{formatTimeRange(slot.startTime, slot.endTime)}</td>
                  <td>{slot.temple.templeName}</td>
                  <td>{slot.availableSeats}</td>
                  <td>
                    <strong>{slot.bookedDevotees} devotees</strong>
                    <small>{slot.activeBookings} bookings</small>
                  </td>
                  <td>{formatPrice(slot.price)}</td>
                  <td>
                    <span className={`status ${badge.tone}`}>
                      <span className="status-dot" aria-hidden="true" />
                      {badge.label}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        aria-label={`Edit slot ${label}`}
                        disabled={slot.status === "expired"}
                        onClick={() => startEdit(slot)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Bookings for slot ${label}`}
                        onClick={() => openDialog({ type: "bookings", slot })}
                      >
                        <ListIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete slot ${label}`}
                        onClick={() => openDialog({ type: "delete", slot })}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  let bookingsBody;
  if (bookingsLoading) {
    bookingsBody = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading bookings</h2>
      </div>
    );
  } else if (bookingsFailed) {
    bookingsBody = (
      <div className="state-card">
        <h2>We could not load the bookings</h2>
        <Button onClick={() => setBookingsRetry((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else if (bookingsData && bookingsData.bookings.length === 0) {
    bookingsBody = <p>No bookings for this slot yet.</p>;
  } else if (bookingsData) {
    bookingsBody = (
      <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
        {bookingsData.bookings.map((booking) => {
          const badge = bookingStatus(booking.status);
          return (
            <div
              key={booking._id}
              style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <span>
                  <strong>{booking.bookingCode}</strong>{" "}
                  <span className={`status ${badge.tone}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {badge.label}
                  </span>
                </span>
                <span>
                  {booking.numberOfDevotees} devotee(s) · {formatPrice(booking.totalAmount)}
                </span>
              </div>
              <div>
                {booking.user ? booking.user.name : "Deleted user"}
                {booking.user && (
                  <small>
                    {" "}
                    {booking.user.email} · {booking.user.phone}
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <label className="field" htmlFor="slots-filter-temple" style={{ maxWidth: 320 }}>
        <span>Temple</span>
        <select
          id="slots-filter-temple"
          value={filterTempleId}
          onChange={(event) => setFilterTempleId(event.target.value)}
        >
          <option value="">All my temples</option>
          {temples.map((temple) => (
            <option key={temple._id} value={temple._id}>
              {temple.templeName}
            </option>
          ))}
        </select>
      </label>

      {notice && (
        <div className="feedback success" role="status">
          {notice}
        </div>
      )}

      <div className="organizer-layout">
        <div style={{ minWidth: 0 }}>{listBody}</div>

        <section className="form-card" style={{ minWidth: 0 }} ref={formRef}>
          <div className="form-section-title">
            <div>
              <h2>{isEditing ? "Edit slot" : "Add slot"}</h2>
            </div>
            {isEditing && (
              <Button variant="secondary" onClick={resetForm} disabled={saving}>
                Cancel edit
              </Button>
            )}
          </div>

          <form noValidate onSubmit={handleSubmit}>
            <label className="field" htmlFor="slot-templeId">
              <span>Temple</span>
              <select
                id="slot-templeId"
                name="templeId"
                value={form.templeId}
                onChange={setField("templeId")}
                disabled={isEditing}
                aria-invalid={fieldErrors.templeId ? "true" : undefined}
              >
                <option value="">Select a temple</option>
                {temples.map((temple) => (
                  <option key={temple._id} value={temple._id}>
                    {temple.templeName}
                  </option>
                ))}
              </select>
              {fieldErrors.templeId && <small className="field-error">{fieldErrors.templeId}</small>}
            </label>

            <SlotField
              label="Date"
              name="date"
              type="date"
              min={todayString()}
              value={form.date}
              onChange={setField("date")}
              disabled={locked}
              error={fieldErrors.date}
            />

            <div className="two-col">
              <SlotField
                label="Start time"
                name="startTime"
                type="time"
                value={form.startTime}
                onChange={setField("startTime")}
                disabled={locked}
                error={fieldErrors.startTime}
              />
              <SlotField
                label="End time"
                name="endTime"
                type="time"
                value={form.endTime}
                onChange={setField("endTime")}
                disabled={locked}
                error={fieldErrors.endTime}
              />
            </div>

            <div className="two-col">
              <SlotField
                label="Available seats"
                name="availableSeats"
                type="text"
                inputMode="numeric"
                value={form.availableSeats}
                onChange={setField("availableSeats")}
                error={fieldErrors.availableSeats}
              />
              <SlotField
                label="Price (IDR)"
                name="price"
                type="text"
                inputMode="numeric"
                value={form.price}
                onChange={setField("price")}
                disabled={locked}
                error={fieldErrors.price}
              />
            </div>

            {locked && (
              <small>This slot has active bookings, so only available seats can be changed.</small>
            )}

            {formError && (
              <p className="field-error" role="alert">
                {formError}
              </p>
            )}
            <Button type="submit" className="wide" loading={saving}>
              {isEditing ? "Save changes" : "Create slot"}
            </Button>
          </form>
        </section>
      </div>

      {dialog?.type === "delete" && (
        <div className="modal-backdrop" onClick={closeDialog}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={closeDialog}
              disabled={deleting}
            >
              ×
            </button>
            <h2 id="slot-dialog-title">Delete this slot?</h2>
            <p>{slotLine(dialog.slot)}</p>
            <div className="modal-note">Slots with bookings cannot be deleted.</div>
            {dialogError && (
              <p className="field-error" role="alert">
                {dialogError}
              </p>
            )}
            <div className="modal-actions">
              <Button variant="secondary" onClick={closeDialog} disabled={deleting}>
                Keep slot
              </Button>
              <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                Delete slot
              </Button>
            </div>
          </div>
        </div>
      )}

      {dialog?.type === "bookings" && (
        <div className="modal-backdrop" onClick={() => setDialog(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="slot-dialog-title"
            style={{ width: "min(560px, 100%)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={() => setDialog(null)}
            >
              ×
            </button>
            <h2 id="slot-dialog-title">Bookings</h2>
            <p>{slotLine(dialog.slot)}</p>
            {bookingsBody}
            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
