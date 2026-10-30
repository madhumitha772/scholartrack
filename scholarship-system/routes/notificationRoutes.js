const express = require("express");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/authMiddleware");
const { idParam } = require("../middleware/validateId");
const router = express.Router();
router.param("id", idParam);
router.use(requireAuth);

router.get("/", async (req, res) => {
    try {
        const items = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(100);
        res.json({ notifications: items, unread: items.filter(n => !n.read).length });
    } catch { res.status(500).json({ success: false, message: "Unable to load notifications." }); }
});

router.get("/unread-count", async (req, res) => {
    try { res.json({ unread: await Notification.countDocuments({ userId: req.user._id, read: false }) }); }
    catch { res.status(500).json({ success: false, message: "Unable to load notifications." }); }
});

router.put("/read-all", async (req, res) => {
    try {
        await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
        res.json({ success: true });
    } catch { res.status(500).json({ success: false, message: "Unable to update notifications." }); }
});

router.put("/:id/read", async (req, res) => {
    try {
        const n = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { read: true }, { new: true });
        if (!n) return res.status(404).json({ success: false, message: "Notification not found." });
        res.json({ success: true, notification: n });
    } catch { res.status(400).json({ success: false, message: "Invalid notification." }); }
});

router.delete("/:id", async (req, res) => {
    try {
        await Notification.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ success: true });
    } catch { res.status(400).json({ success: false, message: "Invalid notification." }); }
});

module.exports = router;
