const express = require("express");
const { param } = require("express-validator");
const validate = require("../middleware/validate");
const { getTemples, getTemple } = require("../controllers/templeController");

const router = express.Router();
router.get("/", getTemples);
// Public: no protect middleware
router.get("/:id", param("id").isMongoId().withMessage("id must be a valid id"), validate, getTemple);

module.exports = router;