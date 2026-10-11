const { body, param, query } = require("express-validator");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Same check as slotRoutes.js: rejects strings like 2026-02-30 that a plain regex would accept
const isRealDate = (value) => {
  const d = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value) {
    throw new Error("date must be a real calendar date");
  }
  return true;
};

const listSlotsValidator = [
  query("templeId").optional().isMongoId().withMessage("templeId must be a valid id"),
];

const slotIdValidator = [
  param("id").isMongoId().withMessage("id must be a valid id"),
];

// Fields shared by create and update. Only these are read; slot ids and temple ids are never taken from here.
const slotFields = [
  body("date")
    .exists().withMessage("date is required")
    .bail()
    .matches(/^\d{4}-\d{2}-\d{2}$/).withMessage("date must be YYYY-MM-DD")
    .bail()
    .custom(isRealDate),

  body("startTime")
    .exists().withMessage("startTime is required")
    .bail()
    .matches(TIME_PATTERN).withMessage("startTime must be HH:mm (24h)"),

  body("endTime")
    .exists().withMessage("endTime is required")
    .bail()
    .matches(TIME_PATTERN).withMessage("endTime must be HH:mm (24h)"),

  body("availableSeats")
    .exists().withMessage("availableSeats is required")
    .bail()
    .isInt({ min: 0, max: 1000 }).withMessage("availableSeats must be a whole number between 0 and 1000")
    .toInt(),

  body("price")
    .exists().withMessage("price is required")
    .bail()
    .isInt({ min: 0, max: 10000000 }).withMessage("price must be a whole number between 0 and 10000000")
    .toInt(),
];

const createSlotValidator = [
  body("templeId")
    .exists().withMessage("templeId is required")
    .bail()
    .isMongoId().withMessage("templeId must be a valid id"),
  ...slotFields,
];

// templeId is not read on update: a slot cannot move to another temple
const updateSlotValidator = [...slotIdValidator, ...slotFields];

module.exports = {
  listSlotsValidator,
  slotIdValidator,
  createSlotValidator,
  updateSlotValidator,
};
