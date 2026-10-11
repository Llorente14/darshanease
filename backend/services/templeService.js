const Temple = require("../models/Temple");

const listTemples = () =>
  Temple.find()
    .select("_id templeName location darshanStartTime darshanEndTime")
    .sort({ templeName: 1 })
    .lean();

module.exports = { listTemples };