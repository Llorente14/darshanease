const { getMailer } = require("../config/mailer");

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);

const priceFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

// "2026-10-12" -> "Monday, October 12, 2026" (built from parts, no UTC shift)
const formatDate = (ymd) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// booking: the DTO from toBookingDTO (bookingCode, slot.date as "YYYY-MM-DD", ...)
const buildBookingEmail = (booking) => {
  const { slot } = booking;
  const rows = [
    ["Booking code", booking.bookingCode],
    ["Booking ID", String(booking._id)],
    ["Temple", slot.temple.templeName],
    ["Location", slot.temple.location],
    ["Date", formatDate(slot.date)],
    ["Time", `${slot.startTime} - ${slot.endTime} WIB`],
    ["Devotees", booking.numberOfDevotees],
    ["Total", priceFormatter.format(booking.totalAmount)],
  ];

  const text = [
    "Your DarshanEase booking is confirmed.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Show your e-ticket at the temple entrance. Please arrive 15 minutes before your darshan time.",
  ].join("\n");

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f8fc;font-family:Arial,Helvetica,sans-serif;color:#24304a;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e8f0;border-radius:14px;overflow:hidden;">
      <div style="padding:20px 24px;background:#c2410c;color:#ffffff;font-size:18px;font-weight:700;">DarshanEase booking confirmed</div>
      <div style="padding:24px;">
        <p style="margin:0 0 16px;">Show your e-ticket at the temple entrance.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="border-collapse:collapse;font-size:14px;">
          ${rows
            .map(
              ([label, value]) => `<tr>
            <td style="border-bottom:1px solid #e4e8f0;color:#68748b;width:40%;">${escapeHtml(label)}</td>
            <td style="border-bottom:1px solid #e4e8f0;font-weight:700;">${escapeHtml(value)}</td>
          </tr>`
            )
            .join("")}
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#68748b;">Please arrive 15 minutes before your darshan time.</p>
      </div>
    </div>
  </body>
</html>`;

  return { subject: `Booking confirmed: ${booking.bookingCode}`, text, html };
};

// Sends the confirmation mail. Callers must not await this inside the booking request:
// a failure here is logged by the caller and never fails the booking.
const sendBookingConfirmation = async ({ booking, user }) => {
  const { subject, text, html } = buildBookingEmail(booking);
  await getMailer().sendMail({
    from: process.env.MAIL_FROM,
    to: user.email,
    subject,
    text,
    html,
  });
};

module.exports = { sendBookingConfirmation, buildBookingEmail };
