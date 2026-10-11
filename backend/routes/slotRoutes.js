const express = require("express");
const { query, param } = require("express-validator");
const validate = require("../middleware/validate"); // CEK: path & cara export validate middleware
const { getSlots, getSlot } = require("../controllers/slotController");

const router = express.Router();

const isRealDate = (value) => {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new Error("date must be a real calendar date");
  }
  return true;
};

router.get(
  "/",
  [
    query("date")
      .optional()
      .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("date must be YYYY-MM-DD")
      .bail()
      .custom(isRealDate),
    query("templeId").optional().isMongoId().withMessage("templeId must be a valid id"),
  ],
  validate,
  getSlots
);

router.get(
  "/:id",
  [param("id").isMongoId().withMessage("id must be a valid id")],
  validate,
  getSlot
);

module.exports = router;