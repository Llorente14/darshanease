const express = require("express");
const { getTemples } = require("../controllers/templeController");

const router = express.Router();
router.get("/", getTemples);

module.exports = router;