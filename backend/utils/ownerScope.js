// Admin sees every temple and slot; an organizer only sees what they own.
const ownerScope = (user) => (user.role === "admin" ? {} : { organizer: user._id });

module.exports = { ownerScope };
