const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const { getAdminReports } = require("../controllers/adminReportController");

const router = express.Router();

// Admin only. Read-only aggregations; see services/adminReportService.js
router.use(protect, authorize("admin"));

router.get("/", getAdminReports);

module.exports = router;
