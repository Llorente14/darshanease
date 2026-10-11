const mongoose = require("mongoose");

const formatFieldErrors = (validationError) =>
  Object.values(validationError.errors || {}).map((err) => ({
    field: err.path,
    message: err.message,
  }));

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let errors = err.errors && Array.isArray(err.errors) ? err.errors : undefined;

  // Mongoose ValidationError -> 400 with field-level errors
  if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Validation failed";
    errors = formatFieldErrors(err);
  }

  // Mongo duplicate key error (code 11000) -> 409 with field-level message
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message =
      field === "email"
        ? "Email is already registered"
        : `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    errors = [{ field, message }];
  }

  // Mongoose CastError (bad ObjectId etc.) -> 400
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

module.exports = errorHandler;
