const { body, param } = require("express-validator");

const updateUserValidator = [
  param("id").isMongoId().withMessage("id must be a valid id"),

  body("role")
    .optional()
    .isIn(["devotee", "organizer", "admin"]).withMessage("role must be devotee, organizer or admin"),

  body("isActive")
    .optional()
    .isBoolean({ strict: true }).withMessage("isActive must be true or false")
    .toBoolean(),

  body().custom((body) => body.role !== undefined || body.isActive !== undefined)
    .withMessage("Provide role or isActive"),
];

module.exports = { updateUserValidator };
