const asyncHandler = require("../utils/asyncHandler");
const { ownerScope } = require("../utils/ownerScope");
const {
  listOrganizerSlots,
  createOrganizerSlot,
  updateOrganizerSlot,
  deleteOrganizerSlot,
  listSlotBookings,
} = require("../services/organizerSlotService");

// The scope comes from the role (admin: all, organizer: own). It is never read from the request.
const listMySlots = asyncHandler(async (req, res) => {
  const slots = await listOrganizerSlots({
    scope: ownerScope(req.user),
    templeId: req.query.templeId,
  });
  res.status(200).json({ success: true, message: "OK", data: { slots } });
});

const createMySlot = asyncHandler(async (req, res) => {
  const slot = await createOrganizerSlot({ scope: ownerScope(req.user), input: req.body });
  res.status(201).json({ success: true, message: "Slot created", data: { slot } });
});

const updateMySlot = asyncHandler(async (req, res) => {
  const slot = await updateOrganizerSlot({
    id: req.params.id,
    scope: ownerScope(req.user),
    input: req.body,
  });
  res.status(200).json({ success: true, message: "Slot updated", data: { slot } });
});

const deleteMySlot = asyncHandler(async (req, res) => {
  await deleteOrganizerSlot({ id: req.params.id, scope: ownerScope(req.user) });
  res.status(200).json({ success: true, message: "Slot deleted" });
});

const getMySlotBookings = asyncHandler(async (req, res) => {
  const { slot, bookings } = await listSlotBookings({
    id: req.params.id,
    scope: ownerScope(req.user),
  });
  res.status(200).json({ success: true, message: "OK", data: { slot, bookings } });
});

module.exports = {
  listMySlots,
  createMySlot,
  updateMySlot,
  deleteMySlot,
  getMySlotBookings,
};
