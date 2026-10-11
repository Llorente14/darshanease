const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  listSlotsValidator,
  slotIdValidator,
  createSlotValidator,
  updateSlotValidator,
} = require("../middleware/validators/organizerSlotValidator");
const {
  listMySlots,
  createMySlot,
  updateMySlot,
  deleteMySlot,
  getMySlotBookings,
} = require("../controllers/organizerSlotController");

const router = express.Router();

// Every route here needs a signed-in organizer or admin (admin sees all temples and slots)
router.use(protect, authorize("organizer", "admin"));

router.get("/", listSlotsValidator, validate, listMySlots);
router.post("/", createSlotValidator, validate, createMySlot);
router.get("/:id/bookings", slotIdValidator, validate, getMySlotBookings);
router.put("/:id", updateSlotValidator, validate, updateMySlot);
router.delete("/:id", slotIdValidator, validate, deleteMySlot);

module.exports = router;
