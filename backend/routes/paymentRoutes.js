const express = require("express");
const { midtransNotificationHandler } = require("../controllers/paymentController");

const router = express.Router();

// Public on purpose: Midtrans calls this URL. Authenticity is checked by the signature, not by a token.
router.post("/midtrans/notification", midtransNotificationHandler);

module.exports = router;
