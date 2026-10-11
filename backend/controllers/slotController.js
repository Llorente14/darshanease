const asyncHandler = require("../utils/asyncHandler"); // CEK
const { listSlots, getSlotById } = require("../services/slotService");

const getSlots = asyncHandler(async (req, res) => {
  const { date, templeId } = req.query;
  const slots = await listSlots({ date, templeId });
  res.status(200).json({ success: true, message: "OK", data: { slots, count: slots.length } });
});

const getSlot = asyncHandler(async (req, res) => {
  const slot = await getSlotById(req.params.id);
  res.status(200).json({ success: true, message: "OK", data: { slot } });
});

module.exports = { getSlots, getSlot };