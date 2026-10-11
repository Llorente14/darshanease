const QRCode = require("qrcode");

// QR payload is only the booking _id: no JSON and no personal data.
// Generated on request, never stored.
const generateTicketQR = (bookingId) =>
  QRCode.toDataURL(String(bookingId), { errorCorrectionLevel: "M", margin: 1, width: 240 });

module.exports = { generateTicketQR };
