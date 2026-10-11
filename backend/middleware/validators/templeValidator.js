const { body, param } = require("express-validator");

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

// Used by POST and PUT /api/organizer/temples. Only these fields are read; organizer and _id are ignored.
// The pair rule (latitude and longitude together) and endTime > startTime are checked by the model on save.
const templeBodyValidator = [
  body("templeName")
    .exists().withMessage("templeName is required")
    .bail()
    .isString().withMessage("templeName must be a string")
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("templeName must be 2-100 characters"),

  body("location")
    .exists().withMessage("location is required")
    .bail()
    .isString().withMessage("location must be a string")
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage("location must be 2-150 characters"),

  body("darshanStartTime")
    .exists().withMessage("darshanStartTime is required")
    .bail()
    .isString()
    .matches(TIME_PATTERN).withMessage("darshanStartTime must be HH:mm (24h)"),

  body("darshanEndTime")
    .exists().withMessage("darshanEndTime is required")
    .bail()
    .isString()
    .matches(TIME_PATTERN).withMessage("darshanEndTime must be HH:mm (24h)"),

  body("description")
    .optional()
    .isString().withMessage("description must be a string")
    .trim()
    .isLength({ max: 2000 }).withMessage("description must be at most 2000 characters"),

  body("imageUrl")
    .optional()
    .isString().withMessage("imageUrl must be a string")
    .trim()
    .custom((value) => value === "" || /^https:\/\/[^\s"'()]+$/.test(value))
    .withMessage("imageUrl must be empty or an https URL"),

  body("offerings")
    .optional()
    .isArray({ max: 10 }).withMessage("offerings must be an array of at most 10 items"),

  body("offerings.*")
    .isString().withMessage("each offering must be 1-60 characters")
    .trim()
    .isLength({ min: 1, max: 60 }).withMessage("each offering must be 1-60 characters"),

  body("latitude")
    .optional({ values: "null" })
    .isFloat({ min: -90, max: 90 }).withMessage("latitude must be between -90 and 90")
    .toFloat(),

  body("longitude")
    .optional({ values: "null" })
    .isFloat({ min: -180, max: 180 }).withMessage("longitude must be between -180 and 180")
    .toFloat(),
];

const templeIdValidator = [
  param("id").isMongoId().withMessage("id must be a valid id"),
];

module.exports = { templeBodyValidator, templeIdValidator };
