const { validationResult } = require("express-validator");

const validate = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  return res.status(422).json({
    success: false,
    message: "Validation failed",
    errors,
  });
};

module.exports = validate;
