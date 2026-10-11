const Temple = require("../models/Temple");
const { listSlots } = require("./slotService");

const listTemples = () =>
  Temple.find()
    .select("_id templeName location darshanStartTime darshanEndTime")
    .sort({ templeName: 1 })
    .lean();

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
});

// Temple details plus its upcoming slots (same slot shape as GET /slots)
const getTempleDetail = async (id) => {
  const temple = await Temple.findById(id)
    .select("templeName location darshanStartTime darshanEndTime description imageUrl offerings")
    .lean();
  if (!temple) {
    const err = new Error("Temple not found");
    err.statusCode = 404;
    throw err;
  }

  const slots = await listSlots({ templeId: id });
  return { temple: toTempleDTO(temple), slots };
};

module.exports = { listTemples, getTempleDetail };