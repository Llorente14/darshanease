const asyncHandler = require("../utils/asyncHandler"); // CEK: kalau export-nya { asyncHandler }, pakai destructuring
const { listTemples } = require("../services/templeService");

const getTemples = asyncHandler(async (req, res) => {
  const temples = await listTemples();
  res.status(200).json({ success: true, message: "OK", data: { temples } });
});

module.exports = { getTemples };