const midtransClient = require("midtrans-client");

// One Snap client for the whole backend. The server key stays here and is never logged or sent to the frontend.
const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

module.exports = { snap };
