const { validateToken } = require("../../middleware/validateToken.middleware");
const { userController } = require("./user.controller");
const { validateInput } = require("../../middleware/validateInput.middleware");
const { updateProfileSchema } = require("./user.inputSchema");

const router = require("express").Router();

router.get("/profile", validateToken, userController.getUser);
router.patch(
  "/profile",
  validateToken,
  validateInput(updateProfileSchema),
  userController.updateUser
);

module.exports = { userRouter: router };
