const Temple = require("../models/Temple");
const DarshanSlot = require("../models/DarshanSlot");
const { listSlots } = require("./slotService");
const { findTempleIdsMatching } = require("../utils/templeSearch");

const listTemples = async ({ q } = {}) => {
  // Same matching rule as GET /slots?q=; without q every temple is returned
  const filter = q ? { _id: { $in: await findTempleIdsMatching(q) } } : {};
  return Temple.find(filter)
    .select("_id templeName location darshanStartTime darshanEndTime")
    .sort({ templeName: 1 })
    .lean();
};

// Temples seeded before USN-10 have no description, imageUrl or offerings stored.
// .lean() skips schema defaults, so the fallbacks live here.
const toTempleDTO = (t) => ({
  _id: t._id,
  templeName: t.templeName,
  location: t.location,
  darshanStartTime: t.darshanStartTime,
  darshanEndTime: t.darshanEndTime,
  description: t.description ?? "",
  imageUrl: t.imageUrl ?? "",
  offerings: t.offerings ?? [],
  // Coordinates are optional; temples without them return null
  latitude: t.latitude ?? null,
  longitude: t.longitude ?? null,
});

// Temple details plus its upcoming slots (same slot shape as GET /slots)
const getTempleDetail = async (id) => {
  const temple = await Temple.findById(id)
    .select("templeName location darshanStartTime darshanEndTime description imageUrl offerings latitude longitude")
    .lean();
  if (!temple) {
    const err = new Error("Temple not found");
    err.statusCode = 404;
    throw err;
  }

  const slots = await listSlots({ templeId: id });
  return { temple: toTempleDTO(temple), slots };
};

// ─── Organizer ──────────────────────────────────────────────────────────────
// Everything below is limited by a scope from ownerScope(): admin sees all temples, an organizer only
// their own. Another organizer's temple returns 404, the same as a missing one.

const EDITABLE_FIELDS = [
  "templeName",
  "location",
  "darshanStartTime",
  "darshanEndTime",
  "description",
  "imageUrl",
  "offerings",
  "latitude",
  "longitude",
];

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Only EDITABLE_FIELDS are copied. organizer, _id and timestamps from the request are never read.
const pickTempleData = (input) => {
  const data = Object.fromEntries(EDITABLE_FIELDS.map((field) => [field, input[field]]));
  return {
    ...data,
    description: data.description ?? "",
    imageUrl: data.imageUrl ?? "",
    offerings: data.offerings ?? [],
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
  };
};

const listOrganizerTemples = async (scope) => {
  const temples = await Temple.find(scope).sort({ templeName: 1 }).lean();
  return temples.map(toTempleDTO);
};

const getOrganizerTemple = async ({ id, scope }) => {
  const temple = await Temple.findOne({ _id: id, ...scope }).lean();
  if (!temple) throw httpError(404, "Temple not found");
  return toTempleDTO(temple);
};

const createOrganizerTemple = async ({ userId, input }) => {
  const doc = await Temple.create({ ...pickTempleData(input), organizer: userId });
  return toTempleDTO(doc.toObject());
};

// Uses a Mongoose document and save(), not findOneAndUpdate: only save() runs the pre("validate")
// hooks (end time after start time, latitude/longitude as a pair).
const updateOrganizerTemple = async ({ id, scope, input }) => {
  const doc = await Temple.findOne({ _id: id, ...scope });
  if (!doc) throw httpError(404, "Temple not found");

  Object.assign(doc, pickTempleData(input));
  await doc.save();
  return toTempleDTO(doc.toObject());
};

// A temple with darshan slots cannot be deleted: listSlots sorts by temple name and would fail.
const deleteOrganizerTemple = async ({ id, scope }) => {
  const owned = await Temple.findOne({ _id: id, ...scope }).select("_id").lean();
  if (!owned) throw httpError(404, "Temple not found");

  const slotCount = await DarshanSlot.countDocuments({ temple: id });
  if (slotCount > 0) {
    throw httpError(
      409,
      "This temple still has darshan slots. Remove them before deleting the temple."
    );
  }

  await Temple.deleteOne({ _id: id, ...scope });
};

module.exports = {
  listTemples,
  getTempleDetail,
  toTempleDTO,
  listOrganizerTemples,
  getOrganizerTemple,
  createOrganizerTemple,
  updateOrganizerTemple,
  deleteOrganizerTemple,
};