const asyncHandler = require("express-async-handler");
const { userService } = require("./user.service");

async function getUser(req, res) {
  res.status(200).json({ user: req.user });
}

async function updateUser(req, res) {
  const { _id } = req.user;
  const updates = req.body;

  const user = await userService.updateUser(_id, updates);

  res.json({ message: "Profile updated successfully", user });
}

const userController = {
  getUser: asyncHandler(getUser),
  updateUser: asyncHandler(updateUser),
};

module.exports = { userController };
