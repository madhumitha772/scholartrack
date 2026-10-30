const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { passwordProblem } = require("./authController");
const emails = require("../utils/emails");

const num = (value) => (value === "" || value === null || value === undefined ? null : Number(value));

function profileOf(user) {
    const u = user.toObject ? user.toObject() : user;
    delete u.password; delete u.resetTokenHash; delete u.resetTokenExpires;
    return u;
}

function completeness(user) {
    const fields = ["name", "email", "phone", "dob", "gender", "address", "state", "college", "course", "department", "year", "cgpa", "category", "familyIncome"];
    const filled = fields.filter(f => user[f] !== null && user[f] !== undefined && user[f] !== "").length;
    return Math.round((filled / fields.length) * 100);
}

async function getProfile(req, res) {
    const profile = profileOf(req.user);
    res.json({ success: true, profile, completeness: completeness(profile) });
}

async function updateProfile(req, res) {
    try {
        const b = req.body;
        const update = {};
        const text = ["name", "phone", "gender", "address", "state", "college", "course", "department", "category"];
        text.forEach(key => { if (b[key] !== undefined) update[key] = String(b[key]).trim(); });
        if (b.dob !== undefined) update.dob = b.dob || null;
        ["year", "cgpa", "familyIncome"].forEach(key => { if (b[key] !== undefined) update[key] = num(b[key]); });

        if (update.name === "") return res.status(400).json({ success: false, message: "Name cannot be empty." });
        if (update.phone && !/^[0-9+\-\s]{10,15}$/.test(update.phone)) return res.status(400).json({ success: false, message: "Enter a valid phone number." });
        if (update.cgpa !== undefined && update.cgpa !== null && (Number.isNaN(update.cgpa) || update.cgpa < 0 || update.cgpa > 10)) {
            return res.status(400).json({ success: false, message: "CGPA must be between 0 and 10." });
        }

        if (update.year !== undefined && update.year !== null && (!Number.isInteger(update.year) || update.year < 1 || update.year > 6)) {
            return res.status(400).json({ success: false, message: "Year must be a whole number between 1 and 6." });
        }
        if (update.familyIncome !== undefined && update.familyIncome !== null && (Number.isNaN(update.familyIncome) || update.familyIncome < 0)) {
            return res.status(400).json({ success: false, message: "Family income must be a positive number." });
        }
        if (update.dob) { const d = new Date(update.dob); if (Number.isNaN(d.getTime()) || d > new Date()) return res.status(400).json({ success: false, message: "Enter a valid date of birth." }); }

        const user = await User.findByIdAndUpdate(req.user._id, update, { new: true, runValidators: true });
        const profile = profileOf(user);
        res.json({ success: true, message: "Profile updated successfully.", profile, completeness: completeness(profile) });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || "Unable to update profile." });
    }
}

async function changePassword(req, res) {
    try {
        const { currentPassword = "", newPassword = "" } = req.body;
        const user = await User.findById(req.user._id);
        if (!(await bcrypt.compare(String(currentPassword), user.password))) {
            return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }
        const problem = passwordProblem(String(newPassword));
        if (problem) return res.status(400).json({ success: false, message: problem });
        user.password = await bcrypt.hash(String(newPassword), 10);
        await user.save();
        emails.sendPasswordChanged(user);
        res.json({ success: true, message: "Password changed successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Unable to change password." });
    }
}

module.exports = { getProfile, updateProfile, changePassword, completeness };
