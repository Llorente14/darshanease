const asyncHandler = require("../utils/asyncHandler");
const { ownerScope } = require("../utils/ownerScope");
const {
  listOrganizerTemples,
  getOrganizerTemple,
  createOrganizerTemple,
  updateOrganizerTemple,
  deleteOrganizerTemple,
} = require("../services/templeService");

// The scope comes from the role (admin: all, organizer: own). It is never read from the request.
const listMyTemples = asyncHandler(async (req, res) => {
  const temples = await listOrganizerTemples(ownerScope(req.user));
  res.status(200).json({ success: true, message: "OK", data: { temples } });
});

const getMyTemple = asyncHandler(async (req, res) => {
  const temple = await getOrganizerTemple({ id: req.params.id, scope: ownerScope(req.user) });
  res.status(200).json({ success: true, message: "OK", data: { temple } });
});

// A temple created here is owned by the signed-in user (an admin owns what they create)
const createMyTemple = asyncHandler(async (req, res) => {
  const temple = await createOrganizerTemple({ userId: req.user._id, input: req.body });
  res.status(201).json({ success: true, message: "Temple created", data: { temple } });
});

const updateMyTemple = asyncHandler(async (req, res) => {
  const temple = await updateOrganizerTemple({
    id: req.params.id,
    scope: ownerScope(req.user),
    input: req.body,
  });
  res.status(200).json({ success: true, message: "Temple updated", data: { temple } });
});

const deleteMyTemple = asyncHandler(async (req, res) => {
  await deleteOrganizerTemple({ id: req.params.id, scope: ownerScope(req.user) });
  res.status(200).json({ success: true, message: "Temple deleted" });
});

module.exports = {
  listMyTemples,
  getMyTemple,
  createMyTemple,
  updateMyTemple,
  deleteMyTemple,
};
