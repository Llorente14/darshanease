const nodemailer = require("nodemailer");

// Brevo SMTP relay. Port 587 uses STARTTLS (secure: false).
// Credentials come from env only; nothing secret lives in code.
const isMailConfigured = () =>
  Boolean(process.env.BREVO_SMTP_HOST && process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS);

let transporter = null;

const getMailer = () => {
  if (!isMailConfigured()) throw new Error("Mail is not configured (BREVO_SMTP_*)");
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST,
      port: Number(process.env.BREVO_SMTP_PORT || 587),
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
      },
    });
  }
  return transporter;
};

module.exports = { getMailer };
