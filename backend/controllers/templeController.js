const asyncHandler = require("../utils/asyncHandler"); // CEK: kalau export-nya { asyncHandler }, pakai destructuring
const { listTemples, getTempleDetail } = require("../services/templeService");

const getTemples = asyncHandler(async (req, res) => {
  const temples = await listTemples();
  res.status(200).json({ success: true, message: "OK", data: { temples } });
});

const getTemple = asyncHandler(async (req, res) => {
  const data = await getTempleDetail(req.params.id);
  res.status(200).json({ success: true, message: "OK", data });
});

module.exports = { getTemples, getTemple };