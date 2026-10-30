const User = require("../models/User");

async function requireAuth(req, res, next) {
    try {
        if (!req.session?.userId) {
            return res.status(401).json({ success: false, message: "Please log in to continue." });
        }
        const user = await User.findById(req.session.userId).select("-password -resetTokenHash -resetTokenExpires");
        if (!user || user.active === false) {
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
        }
        req.user = user;
        next();
    } catch (error) {
        console.error("Authentication error:", error);
        res.status(500).json({ success: false, message: "Authentication check failed." });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "Administrator access required." });
    }
    next();
}

function requireStudent(req, res, next) {
    if (!req.user || req.user.role !== "student") {
        return res.status(403).json({ success: false, message: "This action is for student accounts." });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, requireStudent };

// Attaches req.user when a valid session exists, but never blocks the request.
async function optionalAuth(req, res, next) {
    try {
        if (req.session?.userId) {
            const user = await User.findById(req.session.userId).select("-password -resetTokenHash -resetTokenExpires");
            if (user && user.active !== false) req.user = user;
        }
    } catch (_) { /* treat as logged out */ }
    next();
}

module.exports.optionalAuth = optionalAuth;
