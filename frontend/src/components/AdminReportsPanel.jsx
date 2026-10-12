import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Button from "./Button";
import { getReports } from "../services/adminService";
import { formatPrice, formatSlotDate, formatSlotDateParts } from "../utils/format";

// Same labels and tones as the booking history page
const STATUS_BADGE = {
  confirmed: { label: "Confirmed", tone: "status-success" },
  pending: { label: "Pending", tone: "status-warning" },
  cancelled: { label: "Cancelled", tone: "status-danger" },
  failed: { label: "Failed", tone: "status-danger" },
};

const ROLE_LABEL = { devotee: "Devotee", organizer: "Organizer", admin: "Admin" };

const statusBadge = (status) =>
  STATUS_BADGE[status] ?? { label: String(status ?? "Unknown"), tone: "status-neutral" };

// "2026-10-12" -> "12 Oct". Built from the date parts, so no UTC shift.
const shortDate = (dateString) => {
  const parts = formatSlotDateParts(dateString);
  return `${parts.day} ${parts.month.split(" ")[0]}`;
};

// Width of a ranking bar as a percentage of the top item. Avoids dividing by zero.
const barPercent = (value, top) => (top > 0 ? Math.round((value / top) * 100) : 0);

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

function CardIcon({ children }) {
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
      {children}
    </svg>
  );
}

function MetricCard({ icon, label, value, note }) {
  return (
    <article>
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </div>
    </article>
  );
}

function formatDailyLabel(label) {
  return formatSlotDate(label);
}

export default function AdminReportsPanel() {
  const [retryCount, setRetryCount] = useState(0);

  // Same pattern as MyBookings: a response only counts when its key matches the current request
  const [request, setRequest] = useState({ key: null, data: null, failed: false });
  const requestKey = String(retryCount);
  const isCurrent = request.key === requestKey;
  const loading = !isCurrent;
  const failed = isCurrent && request.failed;
  const report = isCurrent && request.data ? request.data : null;

  useEffect(() => {
    const controller = new AbortController();
    getReports(controller.signal)
      .then((result) => setRequest({ key: requestKey, data: result.data, failed: false }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setRequest({ key: requestKey, data: null, failed: true });
      });
    return () => controller.abort();
  }, [requestKey]);

  if (loading) {
    return (
      <div className="state-card">
        <span className="state-icon spin">
          <SpinnerIcon />
        </span>
        <h2>Loading reports</h2>
        <p>Calculating the latest numbers.</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="state-card">
        <h2>We could not load the reports</h2>
        <p>Please check your connection and try again.</p>
        <Button onClick={() => setRetryCount((count) => count + 1)}>Try again</Button>
      </div>
    );
  }

  const { summary, bookingsByStatus, dailyBookings, topTemples, usersByRole, topLocations } = report;
  const hasDailyBookings = dailyBookings.some((day) => day.bookings > 0);
  const topTempleDevotees = topTemples[0]?.devotees ?? 0;
  const topLocationUsers = topLocations[0]?.users ?? 0;

  return (
    <>
      {/* minWidth 0 on grid items: lets columns shrink below the wide status table on phones */}
      <div className="metrics-grid">
        <MetricCard
          label="Confirmed revenue"
          value={formatPrice(summary.totalRevenue)}
          note={`${formatPrice(summary.totalDonations)} from donations`}
          icon={
            <CardIcon>
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </CardIcon>
          }
        />
        <MetricCard
          label="Confirmed bookings"
          value={summary.confirmedBookings}
          note={`of ${summary.totalBookings} total bookings`}
          icon={
            <CardIcon>
              <path d="M3 9a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V5H3z" />
            </CardIcon>
          }
        />
        <MetricCard
          label="Devotees served"
          value={summary.devoteesServed}
          note="confirmed bookings only"
          icon={
            <CardIcon>
              <circle cx="9" cy="7" r="4" />
              <path d="M17 11a4 4 0 1 0 0-8" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
            </CardIcon>
          }
        />
        <MetricCard
          label="Active users"
          value={summary.activeUsers}
          note={`${summary.inactiveUsers} deactivated`}
          icon={
            <CardIcon>
              <circle cx="9" cy="7" r="4" />
              <path d="M3 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2" />
              <path d="m16 11 2 2 4-4" />
            </CardIcon>
          }
        />
      </div>

      {/* One grid for all chart rows, so the rows keep the same gap as the columns */}
      <div style={{ display: "grid", gap: 18 }}>
        <div className="analytics-grid">
          <section className="chart-card" style={{ minWidth: 0 }}>
            <div className="chart-head">
              <h2>Bookings created, last 14 days</h2>
            </div>
            <small>All statuses. Revenue figures count confirmed bookings only.</small>
            {!hasDailyBookings && <small>No bookings in the last 14 days.</small>}
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dailyBookings} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--line)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={shortDate}
                  tick={{ fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis allowDecimals={false} width={28} tick={{ fontSize: 10 }} />
                <Tooltip
                  cursor={{ fill: "var(--primary-soft)" }}
                  labelFormatter={formatDailyLabel}
                  formatter={(value, name, item) => [
                    `${value} · Confirmed revenue ${formatPrice(item.payload.revenue)}`,
                    "Bookings",
                  ]}
                  contentStyle={{ border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }}
                />
                <Bar
                  dataKey="bookings"
                  name="Bookings"
                  fill="var(--primary-dark)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>

          <section className="chart-card" style={{ minWidth: 0 }}>
            <div className="chart-head">
              <h2>Popular temples</h2>
            </div>
            {topTemples.length === 0 ? (
              <p>No confirmed bookings yet.</p>
            ) : (
              <ol className="ranking-list">
                {topTemples.map((temple, index) => (
                  <li key={temple.templeId}>
                    <span>{index + 1}</span>
                    <div>
                      <p>
                        <strong>{temple.templeName}</strong>
                        <small>{temple.devotees} devotees</small>
                      </p>
                      <div>
                        <span style={{ width: `${barPercent(temple.devotees, topTempleDevotees)}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="analytics-grid">
          <section className="chart-card" style={{ minWidth: 0 }}>
            <div className="chart-head">
              <h2>Bookings by status</h2>
            </div>
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {bookingsByStatus.length === 0 && (
                    <tr>
                      <td colSpan={2}>No bookings yet.</td>
                    </tr>
                  )}
                  {bookingsByStatus.map((row) => {
                    const badge = statusBadge(row.status);
                    return (
                      <tr key={row.status}>
                        <td>
                          <span className={`status ${badge.tone}`}>
                            <span className="status-dot" aria-hidden="true" />
                            {badge.label}
                          </span>
                        </td>
                        <td>{row.count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="chart-card" style={{ minWidth: 0 }}>
            <div className="chart-head">
              <h2>Devotee demographics</h2>
            </div>
            {/* auto-fit: boxes wrap instead of overflowing the card when it is narrow */}
            <div className="demographic-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))" }}>
              {usersByRole.map((row) => (
                <div key={row.role}>
                  <span>{row.count}</span>
                  <strong>{ROLE_LABEL[row.role] ?? row.role}</strong>
                  <small>users</small>
                </div>
              ))}
            </div>
            <h3>Top locations</h3>
            {topLocations.length === 0 ? (
              <p>No devotee addresses yet.</p>
            ) : (
              <ol className="ranking-list">
                {topLocations.map((item, index) => (
                  <li key={item.location}>
                    <span>{index + 1}</span>
                    <div>
                      <p>
                        <strong>{item.location}</strong>
                        <small>{item.users} users</small>
                      </p>
                      <div>
                        <span style={{ width: `${barPercent(item.users, topLocationUsers)}%` }} />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <small>Based on the last part of each devotee&apos;s address.</small>
          </section>
        </div>
      </div>
    </>
  );
}
