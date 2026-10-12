const { query } = require("express-validator");

// Optional search term for temples and darshan slots. Trimmed first, so "   " is rejected like an empty value.
const searchQueryValidator = query("q")
  .optional()
  .isString()
  .trim()
  .isLength({ min: 1, max: 50 })
  .withMessage("q must be 1 to 50 characters");

module.exports = { searchQueryValidator };
