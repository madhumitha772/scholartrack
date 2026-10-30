const Notification = require("../models/Notification");

async function notify(userId, title, message, type = "info", link = "") {
    if (!userId) return null;
    try { return await Notification.create({ userId, title, message, type, link }); }
    catch (error) { console.error("Notification error:", error.message); return null; }
}

module.exports = notify;
