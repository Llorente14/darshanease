const asyncHandler = require("../utils/asyncHandler");
const {
  listOrganizerTemples,
  getOrganizerTemple,
  createOrganizerTemple,
  updateOrganizerTemple,
  deleteOrganizerTemple,
} = require("../services/templeService");

// The owner is always req.user._id, never a value from the request body or params.
const listMyTemples = asyncHandler(async (req, res) => {
  const temples = await listOrganizerTemples(req.user._id);
  res.status(200).json({ success: true, message: "OK", data: { temples } });
});

const getMyTemple = asyncHandler(async (req, res) => {
  const temple = await getOrganizerTemple({ id: req.params.id, userId: req.user._id });
  res.status(200).json({ success: true, message: "OK", data: { temple } });
});

const createMyTemple = asyncHandler(async (req, res) => {
  const temple = await createOrganizerTemple({ userId: req.user._id, input: req.body });
  res.status(201).json({ success: true, message: "Temple created", data: { temple } });
});

const updateMyTemple = asyncHandler(async (req, res) => {
  const temple = await updateOrganizerTemple({
    id: req.params.id,
    userId: req.user._id,
    input: req.body,
  });
  res.status(200).json({ success: true, message: "Temple updated", data: { temple } });
});

const deleteMyTemple = asyncHandler(async (req, res) => {
  await deleteOrganizerTemple({ id: req.params.id, userId: req.user._id });
  res.status(200).json({ success: true, message: "Temple deleted" });
});

module.exports = {
  listMyTemples,
  getMyTemple,
  createMyTemple,
  updateMyTemple,
  deleteMyTemple,
};
