import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  createMyTemple,
  deleteMyTemple,
  getMyTemples,
  updateMyTemple,
} from "../services/organizerService";
import Button from "../components/Button";
import FormInput from "../components/FormInput";
import Footer from "../components/Footer";
import OrganizerSlotsPanel from "../components/OrganizerSlotsPanel";
import Topbar from "../components/Topbar";
import { useAuth } from "../context/useAuth";
import { formatTimeRange } from "../utils/format";
import { modalBackdrop, modalPanel } from "../utils/motionPresets";
import { useToast } from "../components/toastContext";

const EMPTY_FORM = {
  templeName: "",
  location: "",
  darshanStartTime: "",
  darshanEndTime: "",
  description: "",
  imageUrl: "",
  offerings: "",
  latitude: "",
  longitude: "",
};

// Use the image URL for the preview only when it is a valid https URL. Otherwise the CSS default stays.
const safeImageStyle = (imageUrl) => {
  if (!imageUrl) return undefined;
  try {
    const url = new URL(imageUrl);
    return url.protocol === "https:" ? { backgroundImage: `url("${url.href}")` } : undefined;
  } catch {
    return undefined;
  }
};

// Empty input means "no coordinate". A number is sent as a number. Anything else is sent as typed,
// so the server rejects it with a 422 instead of this page guessing a value.
const toCoordinate = (value) => {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : trimmed;
};

const toPayload = (form) => ({
  templeName: form.templeName.trim(),
  location: form.location.trim(),
  darshanStartTime: form.darshanStartTime,
  darshanEndTime: form.darshanEndTime,
  description: form.description.trim(),
  imageUrl: form.imageUrl.trim(),
  offerings: form.offerings
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
  latitude: toCoordinate(form.latitude),
  longitude: toCoordinate(form.longitude),
});

// Server field errors use paths like "offerings[0]". Only the top-level name is needed for the form.
const mapFieldErrors = (errors = []) =>
  Object.fromEntries(errors.map((item) => [item.field.split(/[[.]/)[0], item.message]));

const toForm = (temple) => ({
  templeName: temple.templeName,
  location: temple.location,
  darshanStartTime: temple.darshanStartTime,
  darshanEndTime: temple.darshanEndTime,
  description: temple.description ?? "",
  imageUrl: temple.imageUrl ?? "",
  offerings: (temple.offerings ?? []).join(", "),
  latitude: temple.latitude == null ? "" : String(temple.latitude),
  longitude: temple.longitude == null ? "" : String(temple.longitude),
});

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

function PencilIcon() {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 14h10l1-14" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function OrganizerTemples() {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === "admin";

  // The active tab lives in the URL (?tab=slots), so a refresh keeps the same tab
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "slots" ? "slots" : "temples";
  const selectTab = (next) => setSearchParams(next === "slots" ? { tab: "slots" } : {});

  const [retryCount, setRetryCount] = useState(0);

  // Same pattern as MyBookings: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, data: null, failed: false });
  const requestKey = String(retryCount);
  const isCurrent = request.key === requestKey;
  const loading = !isCurrent;
  const failed = isCurrent && request.failed;
  const temples = isCurrent && request.data ? request.data.temples : [];

  // Form state: editingId is null in create mode and the temple's _id in edit mode
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const formRef = useRef(null);

  // Delete dialog: the temple to delete, or null when closed
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getMyTemples(controller.signal)
      .then((result) => setRequest({ key: requestKey, data: result.data, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequest({ key: requestKey, data: null, failed: true });
      });
    return () => controller.abort();
  }, [requestKey]);

  // Escape closes the delete dialog, except while a request is in flight
  useEffect(() => {
    if (!deleteTarget) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteTarget, deleting]);

  const openDelete = (temple) => {
    setDeleteTarget(temple);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyTemple(deleteTarget._id);
      // If the deleted temple was open in the form, clear the form so it cannot be saved again
      if (editingId === deleteTarget._id) resetForm();
      setDeleteTarget(null);
      toast.success("Temple deleted.");
      setRetryCount((count) => count + 1);
    } catch (err) {
      // 409 means the temple still has darshan slots; the API message is shown in a toast
      toast.error(err);
    } finally {
      setDeleting(false);
    }
  };

  const setField = (name) => (event) =>
    setForm((current) => ({ ...current, [name]: event.target.value }));

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError("");
  };

  const startEdit = (temple) => {
    setEditingId(temple._id);
    setForm(toForm(temple));
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
    try {
      const payload = toPayload(form);
      if (editingId) {
        await updateMyTemple(editingId, payload);
        toast.success("Temple updated.");
      } else {
        await createMyTemple(payload);
        toast.success("Temple created.");
      }
      resetForm();
      setRetryCount((count) => count + 1);
    } catch (err) {
      // Field validation stays inline under the fields; any other API or network error goes to a toast
      const data = err.response?.data;
      const fields = mapFieldErrors(data?.errors);
      setFieldErrors(fields);
      if (Object.keys(fields).length > 0) setFormError(data?.message || "Please check the highlighted fields.");
      else toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  let listBody;
  if (loading) {
    listBody = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading your temples</h2>
        <p>Fetching the temples you manage.</p>
      </div>
    );
  } else if (failed) {
    listBody = (
      <div className="state-card">
        <h2>We could not load your temples</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else if (temples.length === 0) {
    listBody = (
      <div className="state-card">
        <h2>No temples yet</h2>
        <p>Use the form to add your first temple.</p>
      </div>
    );
  } else {
    listBody = (
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Temple</th>
              <th>Darshan hours</th>
              <th>Offerings</th>
              <th>Map</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {temples.map((temple) => {
              const hasMap = temple.latitude != null && temple.longitude != null;
              return (
                <tr key={temple._id}>
                  <td>
                    <strong>{temple.templeName}</strong>
                    <small>{temple.location}</small>
                  </td>
                  <td>{formatTimeRange(temple.darshanStartTime, temple.darshanEndTime)}</td>
                  <td>{temple.offerings.length}</td>
                  <td>{hasMap ? "Yes" : "—"}</td>
                  <td>
                    <div className="row-actions">
                      <button
                        type="button"
                        aria-label={`Edit ${temple.templeName}`}
                        onClick={() => startEdit(temple)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${temple.templeName}`}
                        onClick={() => openDelete(temple)}
                      >
                        <TrashIcon />
                      </button>
                      <Link
                        to={`/temples/${temple._id}`}
                        aria-label={`View ${temple.templeName}`}
                      >
                        <EyeIcon />
                      </Link>
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

  const isEditing = editingId !== null;

  return (
    <div className="public-shell">
      <title>Organizer | DarshanEase</title>
      <Topbar />
      <main className="slots-main">
        <div className="page-header">
          <div>
            <span className="eyebrow">{isAdmin ? "Admin" : "Organizer"}</span>
            <h1>Organizer dashboard</h1>
            <p>Create and update the temples devotees can book, and manage their darshan slots.</p>
            {isAdmin && <p>You are viewing every temple and slot as an admin.</p>}
          </div>
        </div>
        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "temples"}
            className={tab === "temples" ? "active" : ""}
            onClick={() => selectTab("temples")}
          >
            Temples <span>{temples.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "slots"}
            className={tab === "slots" ? "active" : ""}
            onClick={() => selectTab("slots")}
          >
            Slots
          </button>
        </div>
        {tab === "temples" ? (
          <>
          <div className="organizer-layout">
            {/* minWidth 0: lets the single-column grid shrink below the table width on phones */}
            <div style={{ minWidth: 0 }}>{listBody}</div>

            <section className="form-card" style={{ minWidth: 0 }} ref={formRef}>
              <div className="form-section-title">
                <div>
                  <h2>{isEditing ? "Edit temple" : "Add temple"}</h2>
                </div>
                {isEditing && (
                  <Button variant="secondary" onClick={resetForm} disabled={saving}>
                    Cancel edit
                  </Button>
                )}
              </div>

              <form noValidate onSubmit={handleSubmit}>
                <FormInput
                  label="Temple name"
                  name="templeName"
                  value={form.templeName}
                  onChange={setField("templeName")}
                  maxLength={100}
                  error={fieldErrors.templeName}
                />
                <FormInput
                  label="Location"
                  name="location"
                  value={form.location}
                  onChange={setField("location")}
                  maxLength={150}
                  error={fieldErrors.location}
                />
                <div className="two-col">
                  <FormInput
                    label="Darshan start"
                    name="darshanStartTime"
                    type="time"
                    value={form.darshanStartTime}
                    onChange={setField("darshanStartTime")}
                    error={fieldErrors.darshanStartTime}
                  />
                  <FormInput
                    label="Darshan end"
                    name="darshanEndTime"
                    type="time"
                    value={form.darshanEndTime}
                    onChange={setField("darshanEndTime")}
                    error={fieldErrors.darshanEndTime}
                  />
                </div>
                <label className="field" htmlFor="field-description">
                  <span>Description</span>
                  <textarea
                    id="field-description"
                    name="description"
                    value={form.description}
                    onChange={setField("description")}
                    maxLength={2000}
                    aria-invalid={fieldErrors.description ? "true" : undefined}
                  />
                  {fieldErrors.description && (
                    <small className="field-error">{fieldErrors.description}</small>
                  )}
                </label>
                <FormInput
                  label="Image URL"
                  name="imageUrl"
                  type="url"
                  placeholder="https://res.cloudinary.com/..."
                  value={form.imageUrl}
                  onChange={setField("imageUrl")}
                  error={fieldErrors.imageUrl}
                />
                <div
                  className="image-preview"
                  style={safeImageStyle(form.imageUrl.trim())}
                  aria-hidden="true"
                />
                <FormInput
                  label="Offerings"
                  name="offerings"
                  placeholder="Comma separated, e.g. Rudrabhishek, Evening Aarti"
                  value={form.offerings}
                  onChange={setField("offerings")}
                  error={fieldErrors.offerings}
                />
                <div className="two-col">
                  <FormInput
                    label="Latitude"
                    name="latitude"
                    inputMode="decimal"
                    value={form.latitude}
                    onChange={setField("latitude")}
                    placeholder="25.3109"
                    error={fieldErrors.latitude}
                  />
                  <FormInput
                    label="Longitude"
                    name="longitude"
                    inputMode="decimal"
                    value={form.longitude}
                    onChange={setField("longitude")}
                    placeholder="83.0107"
                    error={fieldErrors.longitude}
                  />
                </div>
                <small>Optional. Fill both or leave both empty.</small>

                {formError && (
                  <p className="field-error" role="alert">
                    {formError}
                  </p>
                )}
                <Button type="submit" className="wide" loading={saving}>
                  {isEditing ? "Save changes" : "Create temple"}
                </Button>
              </form>
            </section>
          </div>
          </>
        ) : (
          <OrganizerSlotsPanel temples={temples} />
        )}
      </main>
      <Footer />

      <AnimatePresence>
      {deleteTarget && (
        <motion.div className="modal-backdrop" onClick={closeDelete} {...modalBackdrop}>
          <motion.div
            {...modalPanel}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={closeDelete}
              disabled={deleting}
            >
              ×
            </button>
            <h2 id="delete-title">Delete this temple?</h2>
            <p>
              {deleteTarget.templeName} · {deleteTarget.location}
            </p>
            <div className="modal-note">Temples that still have darshan slots cannot be deleted.</div>
            <div className="modal-actions">
              <Button variant="secondary" onClick={closeDelete} disabled={deleting}>
                Keep temple
              </Button>
              <Button variant="danger" loading={deleting} onClick={confirmDelete}>
                Delete temple
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
