const { body } = require("express-validator");

const registerValidator = [
  body("name")
    .exists({ checkFalsy: true }).withMessage("Name is required")
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .exists({ checkFalsy: true }).withMessage("Email is required")
    .bail()
    .trim()
    .isEmail().withMessage("Email must be a valid email address")
    .bail()
    .normalizeEmail(),

  body("phone")
    .exists({ checkFalsy: true }).withMessage("Phone is required")
    .bail()
    .customSanitizer((value) => value.replace(/[\s-]/g, ""))
    .matches(/^\+?[0-9]{9,15}$/).withMessage("Phone must be 9-15 digits, optionally starting with +"),

  body("address")
    .exists({ checkFalsy: true }).withMessage("Address is required")
    .bail()
    .trim()
    .isLength({ min: 5, max: 255 }).withMessage("Address must be between 5 and 255 characters"),

  body("password")
    .exists({ checkFalsy: true }).withMessage("Password is required")
    .bail()
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters")
    .bail()
    .matches(/[A-Za-z]/).withMessage("Password must contain at least 1 letter")
    .bail()
    .matches(/[0-9]/).withMessage("Password must contain at least 1 number"),
];

module.exports = { registerValidator };
