const Temple = require("../models/Temple");

// Escapes regex special characters so the user's text is always matched literally
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// A temple matches when the term appears (case-insensitive, partial) in its name, its location or one of its offerings
const findTempleIdsMatching = (q) => {
  const pattern = new RegExp(escapeRegex(q), "i");
  return Temple.find({
    $or: [{ templeName: pattern }, { location: pattern }, { offerings: pattern }],
  }).distinct("_id");
};

module.exports = { findTempleIdsMatching };
