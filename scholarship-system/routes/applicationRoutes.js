const express = require("express");
const { createApplication, getApplications, getApplicationById, updateStatus, withdraw, mySummary } = require("../controllers/applicationController");
const { requireAuth, requireAdmin, requireStudent } = require("../middleware/authMiddleware");
const { idParam } = require("../middleware/validateId");
const router = express.Router();
router.param("id", idParam);

router.use(requireAuth);
router.get("/summary/me", requireStudent, mySummary);
router.post("/", requireStudent, createApplication);
router.get("/", getApplications);
router.get("/:id", getApplicationById);
router.put("/:id/status", requireAdmin, updateStatus);
router.delete("/:id", requireStudent, withdraw);

module.exports = router;
