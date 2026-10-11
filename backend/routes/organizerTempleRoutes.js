const express = require("express");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const {
  templeBodyValidator,
  templeIdValidator,
} = require("../middleware/validators/templeValidator");
const {
  listMyTemples,
  getMyTemple,
  createMyTemple,
  updateMyTemple,
  deleteMyTemple,
} = require("../controllers/organizerTempleController");

const router = express.Router();

// Every route here needs a signed-in organizer or admin (admin sees all temples and slots)
router.use(protect, authorize("organizer", "admin"));

router.get("/", listMyTemples);
router.post("/", templeBodyValidator, validate, createMyTemple);
router.get("/:id", templeIdValidator, validate, getMyTemple);
router.put("/:id", templeIdValidator, templeBodyValidator, validate, updateMyTemple);
router.delete("/:id", templeIdValidator, validate, deleteMyTemple);

module.exports = router;
