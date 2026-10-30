const express = require("express");
const { getProfile, updateProfile, changePassword } = require("../controllers/profileController");
const { requireAuth } = require("../middleware/authMiddleware");
const router = express.Router();

router.use(requireAuth);
router.get("/", getProfile);
router.put("/", updateProfile);
router.put("/password", changePassword);

module.exports = router;
