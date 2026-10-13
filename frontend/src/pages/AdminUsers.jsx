import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/useAuth";
import { getUsers, updateUser } from "../services/adminService";
import Button from "../components/Button";
import Footer from "../components/Footer";
import StyledSelect from "../components/StyledSelect";
import Topbar from "../components/Topbar";
import { useToast } from "../components/toastContext";
import { modalBackdrop, modalPanel } from "../utils/motionPresets";

const ROLE_OPTIONS = [
  { value: "devotee", label: "Devotee" },
  { value: "organizer", label: "Organizer" },
  { value: "admin", label: "Admin" },
];

const roleLabel = (role) => ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const formatJoined = (createdAt) => {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
};

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

function SearchIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

// Recharts is only downloaded when the Reports tab is opened
const AdminReportsPanel = lazy(() => import("../components/AdminReportsPanel"));

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  // The active tab lives in the URL (?tab=reports), so a refresh keeps the same tab
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "reports" ? "reports" : "users";
  const selectTab = (next) => setSearchParams(next === "reports" ? { tab: "reports" } : {});
  const [retryCount, setRetryCount] = useState(0);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Same pattern as MyBookings: a response only counts when its key matches the current request.
  // Role and status changes patch the row in this state, so the list updates without a reload.
  const [request, setRequest] = useState({ key: null, data: null, failed: false });
  const requestKey = String(retryCount);
  const isCurrent = request.key === requestKey;
  const loading = !isCurrent;
  const failed = isCurrent && request.failed;
  const users = isCurrent && request.data ? request.data.users : [];

  // One dialog at a time: a role change or an activate/deactivate action on one user
  const [dialog, setDialog] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getUsers(controller.signal)
      .then((result) => setRequest({ key: requestKey, data: result.data, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequest({ key: requestKey, data: null, failed: true });
      });
    return () => controller.abort();
  }, [requestKey]);

  // Escape closes the dialog, except while a request is in flight
  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !submitting) setDialog(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dialog, submitting]);

  const openDialog = (next) => {
    setDialog(next);
  };

  const closeDialog = () => {
    if (submitting) return;
    setDialog(null);
  };

  // Cancelling leaves the select on the old role: the select is controlled by the stored user.role
  const confirmChange = async () => {
    setSubmitting(true);
    const payload =
      dialog.type === "role" ? { role: dialog.nextRole } : { isActive: dialog.nextActive };
    try {
      const result = await updateUser(dialog.user._id, payload);
      const updated = result.data.user;
      setRequest((prev) =>
        prev.key === requestKey && prev.data
          ? {
              ...prev,
              data: {
                ...prev.data,
                users: prev.data.users.map((item) => (item._id === updated._id ? updated : item)),
              },
            }
          : prev
      );
      setDialog(null);
      toast.success("User updated.");
    } catch (err) {
      toast.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const term = search.trim().toLowerCase();
  const visible = users.filter(
    (item) =>
      (!roleFilter || item.role === roleFilter) &&
      (!term || item.name.toLowerCase().includes(term) || item.email.toLowerCase().includes(term))
  );

  let body;
  if (loading) {
    body = (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading users</h2>
        <p>Fetching the account list.</p>
      </div>
    );
  } else if (failed) {
    body = (
      <div className="state-card">
        <h2>We could not load the users</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
      </div>
    );
  } else if (users.length === 0) {
    body = (
      <div className="state-card">
        <h2>No users yet</h2>
      </div>
    );
  } else {
    body = (
      <>
        <div className="table-tools">
          <div>
            <SearchIcon />
            <input
              type="text"
              aria-label="Search users"
              placeholder="Search name or email"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <span className="field" style={{ marginBottom: 0 }}>
            <span>Role</span>
            <StyledSelect
              label="Filter by role"
              value={roleFilter}
              options={[{ value: "", label: "All roles" }, ...ROLE_OPTIONS]}
              onChange={setRoleFilter}
              minWidth={130}
            />
          </span>
        </div>

        {visible.length === 0 ? (
          <div className="state-card">
            <h2>No users match your filters</h2>
            <p>Try another name, email, or role.</p>
          </div>
        ) : (
          <div className="table-card">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => {
                  const isSelf = me && item._id === me._id;
                  return (
                    <tr key={item._id}>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.email}</small>
                        {isSelf && <small>You</small>}
                      </td>
                      <td>{item.phone}</td>
                      <td>
                        <StyledSelect
                          label={`Role for ${item.name}`}
                          value={item.role}
                          options={ROLE_OPTIONS}
                          disabled={isSelf || submitting}
                          minWidth={120}
                          onChange={(nextRole) => openDialog({ type: "role", user: item, nextRole })}
                        />
                      </td>
                      <td>
                        <span className={`status ${item.isActive ? "status-success" : "status-danger"}`}>
                          <span className="status-dot" aria-hidden="true" />
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{formatJoined(item.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          disabled={isSelf || submitting}
                          onClick={() =>
                            openDialog({ type: "status", user: item, nextActive: !item.isActive })
                          }
                        >
                          {item.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </>
    );
  }

  let dialogContent = null;
  if (dialog?.type === "role") {
    dialogContent = (
      <>
        <h2 id="admin-dialog-title">Change role?</h2>
        <p>
          {dialog.user.name} will become {roleLabel(dialog.nextRole)}.
        </p>
      </>
    );
  } else if (dialog?.type === "status") {
    dialogContent = dialog.nextActive ? (
      <>
        <h2 id="admin-dialog-title">Activate account?</h2>
        <p>{dialog.user.name} will be able to log in again.</p>
      </>
    ) : (
      <>
        <h2 id="admin-dialog-title">Deactivate account?</h2>
        <p>
          {dialog.user.name} will be signed out and cannot log in until reactivated.
        </p>
      </>
    );
  }

  return (
    <div className="public-shell">
      <title>Admin | DarshanEase</title>
      <Topbar />
      <main className="slots-main">
        <div className="page-header">
          <div>
            <span className="eyebrow">Admin</span>
            <h1>Admin dashboard</h1>
            <p>Manage user roles and account access.</p>
            <Link className="text-link" to="/organizer">
              Manage temples and slots
            </Link>
          </div>
        </div>
        <div className="admin-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "users"}
            className={tab === "users" ? "active" : ""}
            onClick={() => selectTab("users")}
          >
            Users
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "reports"}
            className={tab === "reports" ? "active" : ""}
            onClick={() => selectTab("reports")}
          >
            Reports
          </button>
        </div>
        {tab === "users" ? (
          <>
            {body}
          </>
        ) : (
          <Suspense
            fallback={
              <div className="state-card">
                <h2>Loading reports</h2>
              </div>
            }
          >
            <AdminReportsPanel />
          </Suspense>
        )}
      </main>
      <Footer />

      <AnimatePresence>
      {dialog && (
        <motion.div className="modal-backdrop" onClick={closeDialog} {...modalBackdrop}>
          <motion.div
            {...modalPanel}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close"
              onClick={closeDialog}
              disabled={submitting}
            >
              ×
            </button>
            {dialogContent}
            <div className="modal-actions">
              <Button variant="secondary" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              {dialog.type === "role" ? (
                <Button loading={submitting} onClick={confirmChange}>
                  Change role
                </Button>
              ) : (
                <Button
                  variant={dialog.nextActive ? "primary" : "danger"}
                  loading={submitting}
                  onClick={confirmChange}
                >
                  {dialog.nextActive ? "Activate" : "Deactivate"}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
