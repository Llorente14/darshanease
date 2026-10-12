const asyncHandler = require("../utils/asyncHandler");
const { getReports } = require("../services/adminReportService");

const getAdminReports = asyncHandler(async (req, res) => {
  const data = await getReports();
  res.status(200).json({ success: true, message: "OK", data });
});

module.exports = { getAdminReports };
