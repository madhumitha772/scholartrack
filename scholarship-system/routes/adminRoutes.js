const express = require("express");
const c = require("../controllers/adminController");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");
const { idParam } = require("../middleware/validateId");
const router = express.Router();
router.param("id", idParam);

router.use(requireAuth, requireAdmin);
router.get("/stats", c.stats);
router.get("/students", c.students);
router.get("/students/:id", c.studentDetail);
router.put("/students/:id/active", c.setStudentActive);
router.get("/documents", c.documents);
router.get("/reports", c.reports);
router.get("/export/applications.csv", c.exportApplications);

module.exports = router;
