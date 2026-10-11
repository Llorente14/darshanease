const { body, param } = require("express-validator");
const { MAX_DONATION_IDR } = require("../../utils/bookingPolicy");

// Only slotId, numberOfDevotees and donationAmount are read. totalAmount from the client is ignored.
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

  body("donationAmount")
    .optional()
    .isInt({ min: 0, max: MAX_DONATION_IDR })
    .withMessage(`donationAmount must be a whole number between 0 and ${MAX_DONATION_IDR}`)
    .toInt(),
];

const getBookingValidator = [
  param("id").isMongoId().withMessage("id must be a valid id"),
];

const modifyBookingValidator = [
  param("id").isMongoId().withMessage("id must be a valid id"),

  body("numberOfDevotees")
    .exists().withMessage("numberOfDevotees is required")
    .bail()
    .isInt({ min: 1, max: 10 }).withMessage("numberOfDevotees must be between 1 and 10")
    .toInt(),
];

module.exports = { createBookingValidator, getBookingValidator, modifyBookingValidator };
