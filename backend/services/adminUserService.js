const User = require("../models/User");

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

// Never includes password. Accounts created before isActive existed count as active.
const toAdminUserDTO = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive !== false,
  createdAt: user.createdAt,
});

// Capped at 500 for now; pagination is not needed at this size
const listUsers = async () => {
  const users = await User.find().sort({ createdAt: -1 }).limit(500).lean();
  return users.map(toAdminUserDTO);
};

// Changes role and/or isActive only. Admins cannot change their own role or status, so the last
// admin cannot lock themselves out. The password is not loaded (select:false), so validation runs only on
// the modified fields; otherwise the required password check would fail. The hash hook skips it too.
const updateUser = async ({ actorId, id, role, isActive }) => {
  if (String(id) === String(actorId)) {
    throw httpError(400, "You cannot change your own role or status");
  }

  const user = await User.findById(id);
  if (!user) throw httpError(404, "User not found");

  if (role !== undefined) user.role = role;
  if (isActive !== undefined) user.isActive = isActive;
  await user.save({ validateModifiedOnly: true });

  return toAdminUserDTO(user.toObject());
};

module.exports = { listUsers, updateUser, toAdminUserDTO };
