const asyncHandler = require("../utils/asyncHandler");
const { handleNotification } = require("../services/paymentService");

// Midtrans retries any response that is not 200, so this always answers 200 once the signature is valid.
// A booking we do not know is also answered 200. Bad signatures get 403 from the service.
const midtransNotificationHandler = asyncHandler(async (req, res) => {
  await handleNotification(req.body);
  res.status(200).json({ success: true });
});

module.exports = { midtransNotificationHandler };
