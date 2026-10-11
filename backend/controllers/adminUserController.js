const asyncHandler = require("../utils/asyncHandler");
const { listUsers, updateUser } = require("../services/adminUserService");

const listAdminUsers = asyncHandler(async (req, res) => {
  const users = await listUsers();
  res.status(200).json({ success: true, message: "OK", data: { users } });
});

const updateAdminUser = asyncHandler(async (req, res) => {
  const { role, isActive } = req.body;
  const user = await updateUser({
    actorId: req.user._id,
    id: req.params.id,
    role,
    isActive,
  });
  res.status(200).json({ success: true, message: "User updated", data: { user } });
});

module.exports = { listAdminUsers, updateAdminUser };
