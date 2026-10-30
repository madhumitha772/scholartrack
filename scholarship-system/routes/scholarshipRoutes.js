const express = require("express");
const { requireAuth, requireAdmin, optionalAuth } = require("../middleware/authMiddleware");
const { list, meta, getOne, create, update, remove } = require("../controllers/scholarshipController");
const { idParam } = require("../middleware/validateId");
const router = express.Router();
router.param("id", idParam);

router.get("/", list);
router.get("/meta/filters", meta);
router.get("/:id", optionalAuth, getOne);
router.post("/", requireAuth, requireAdmin, create);
router.put("/:id", requireAuth, requireAdmin, update);
router.delete("/:id", requireAuth, requireAdmin, remove);

module.exports = router;
