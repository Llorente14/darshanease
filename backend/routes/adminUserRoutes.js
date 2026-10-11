const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { updateUserValidator } = require("../middleware/validators/adminUserValidator");
const { listAdminUsers, updateAdminUser } = require("../controllers/adminUserController");

const router = express.Router();

// Admin only
router.use(protect, authorize("admin"));

router.get("/", listAdminUsers);
router.patch("/:id", updateUserValidator, validate, updateAdminUser);

module.exports = router;
