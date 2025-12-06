const router = require("express").Router();
const { settingsController } = require("./settings.controller");
const { validateToken } = require("../../middleware/validateToken.middleware");

router.use(validateToken);

router.get("/", settingsController.getSettings);
router.put("/", settingsController.updateSettings);

module.exports = { settingsRouter: router };
