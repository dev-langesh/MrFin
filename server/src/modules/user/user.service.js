const { AuthErrors } = require("../../errors/authErrors");
const { AppError } = require("../../utils/error");
const { User } = require("./user.model");

async function createUser(data) {
  let user = await User.findOne({ email: data.email });

  if (user) {
    throw new AppError(AuthErrors.USER_ALREADY_EXISTS);
  }

  return await User.create(data);
}

async function findUserByEmail(
  email,
  includePassword = false,
  throwIfNotFound = true
) {
  const user = await User.findOne({ email }).select(
    (includePassword ? "+" : "-") + "password"
  );

  if (!user && throwIfNotFound) {
    throw new AppError(AuthErrors.USER_NOT_FOUND);
  }

  return user;
}

async function findUserById(id) {
  const user = await User.findById(id).select("-password");
  if (!user) {
    throw new AppError(AuthErrors.USER_NOT_FOUND);
  }
  return user;
}

async function verifyUserByEmail(email) {
  const user = await findUserByEmail(email);

  user.verified = true;
  return await user.save();
}

async function resetPassword(userId, password) {
  const user = await findUserById(userId);

  user.password = password;
  return await user.save();
}

async function updateUser(userId, data) {
  const allowedUpdates = ["name", "country"];
  const updates = {};

  Object.keys(data).forEach((key) => {
    if (allowedUpdates.includes(key)) {
      updates[key] = data[key];
    }
  });

  if (Object.keys(updates).length === 0) {
    return await findUserById(userId);
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new AppError(AuthErrors.USER_NOT_FOUND);
  }

  return user;
}

const userService = {
  createUser,
  findUserByEmail,
  findUserById,
  verifyUserByEmail,
  resetPassword,
  updateUser,
};

module.exports = { userService };
