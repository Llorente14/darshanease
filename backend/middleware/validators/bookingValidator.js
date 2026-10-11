const { body, param } = require("express-validator");

// Only slotId and numberOfDevotees are read. totalAmount and any other body field are ignored.
const createBookingValidator = [
  body("slotId")
    .exists().withMessage("slotId is required")
    .bail()
    .isMongoId().withMessage("slotId must be a valid id"),

  body("numberOfDevotees")
    .exists().withMessage("numberOfDevotees is required")
    .bail()
    .isInt({ min: 1, max: 10 }).withMessage("numberOfDevotees must be between 1 and 10")
    .toInt(),
];

const getBookingValidator = [
  param("id").isMongoId().withMessage("id must be a valid id"),
];

module.exports = { createBookingValidator, getBookingValidator };
