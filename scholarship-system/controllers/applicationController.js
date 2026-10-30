const fs = require("fs");
const mongoose = require("mongoose");
const path = require("path");
const Application = require("../models/Application");
const Scholarship = require("../models/Scholarship");
const Document = require("../models/Document");
const User = require("../models/User");
const Notification = require("../models/Notification");
const notify = require("../utils/notify");
const emails = require("../utils/emails");
const { checkEligibility } = require("../utils/eligibility");
const { nextSequence } = require("../models/Counter");
const { STATUSES } = Application;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const FINAL = ["Approved", "Rejected"];

function removeFile(filePath) {
    if (!filePath) return;
    const absolute = path.join(__dirname, "..", filePath.replace(/^\//, ""));
    fs.unlink(absolute, () => {});
}

async function createApplication(req, res) {
    try {
        const b = req.body;
        if (!mongoose.isValidObjectId(b.scholarshipId)) return res.status(400).json({ success: false, message: "Choose a valid scholarship." });
        const scholarship = await Scholarship.findById(b.scholarshipId);
        if (!scholarship) return res.status(404).json({ success: false, message: "Scholarship not found." });

        const p = b.personal || {}, a = b.academic || {}, f = b.financial || {}, o = b.other || {};
        const fail = (message) => res.status(400).json({ success: false, message });
        const text = (v) => String(v ?? "").trim();

        const name = text(p.name || req.user.name), email = text(p.email || req.user.email).toLowerCase(), phone = text(p.phone);
        const college = text(a.college), course = text(a.course);
        if (name.length < 2 || name.length > 100) return fail("Enter your full name.");
        if (!/^\S+@\S+\.\S+$/.test(email)) return fail("Enter a valid email address.");
        if (!/^[0-9+\-\s]{10,15}$/.test(phone)) return fail("Enter a valid phone number (10 to 15 digits).");
        if (!college) return fail("College name is required.");
        if (!course) return fail("Course is required.");

        const cgpa = Number(a.cgpa);
        const familyIncome = Number(f.familyIncome);
        if (a.cgpa === "" || a.cgpa == null || Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10) return fail("CGPA must be a number between 0 and 10.");
        if (f.familyIncome === "" || f.familyIncome == null || Number.isNaN(familyIncome) || familyIncome < 0) return fail("Annual family income must be a positive number.");
        const year = a.year === "" || a.year == null ? 1 : Number(a.year);
        if (!Number.isInteger(year) || year < 1 || year > 6) return fail("Year of study must be between 1 and 6.");
        const previousMarks = a.previousMarks === "" || a.previousMarks == null ? null : Number(a.previousMarks);
        if (previousMarks !== null && (Number.isNaN(previousMarks) || previousMarks < 0 || previousMarks > 100)) return fail("Previous marks must be between 0 and 100.");
        let dob = null;
        if (p.dob) { dob = new Date(p.dob); if (Number.isNaN(dob.getTime()) || dob > new Date()) return fail("Enter a valid date of birth."); }

        const category = text(o.category) || "General";
        if (!["General", "OBC", "SC", "ST", "EWS", "Minority"].includes(category)) return fail("Invalid category.");

        if (await Application.exists({ userId: req.user._id, scholarshipId: scholarship._id })) {
            return res.status(409).json({ success: false, message: "You have already applied for this scholarship." });
        }

        const check = checkEligibility(scholarship, {
            cgpa, familyIncome, category, gender: req.user.gender, course, state: req.user.state
        });
        if (!check.eligible) return res.status(400).json({ success: false, message: check.reasons[0], reasons: check.reasons });

        const doc = {
            userId: req.user._id,
            scholarshipId: scholarship._id,
            scholarship: scholarship.name,
            amount: scholarship.amount,
            personal: { name, email, phone, dob, address: text(p.address).slice(0, 500) },
            academic: { college, course, department: text(a.department), year, cgpa, previousMarks },
            financial: { familyIncome, guardianOccupation: text(f.guardianOccupation) },
            other: { category, achievements: text(o.achievements).slice(0, 2000), extracurricular: text(o.extracurricular).slice(0, 2000) },
            history: [{ status: "Submitted", note: "Application submitted by student.", by: req.user.name }]
        };

        // Application numbers come from an atomic counter. A clash with an older number (data created
        // before the counter existed) simply moves on to the next value.
        let application = null;
        for (let attempt = 0; attempt < 25 && !application; attempt++) {
            const no = `SCH${new Date().getFullYear()}${await nextSequence("applicationNo", 1000)}`;
            try {
                application = await Application.create({ ...doc, applicationNo: no });
            } catch (error) {
                if (error.code !== 11000) throw error;
                if (await Application.exists({ userId: req.user._id, scholarshipId: scholarship._id })) {
                    return res.status(409).json({ success: false, message: "You have already applied for this scholarship." });
                }
            }
        }
        if (!application) return res.status(500).json({ success: false, message: "Could not generate an application number. Please try again." });

        await notify(req.user._id, "Application submitted",
            `Your application ${application.applicationNo} for ${application.scholarship} was submitted.`, "success", `/tracking.html?id=${application._id}`);

        emails.sendApplicationSubmitted(req.user, application);
        res.status(201).json({ success: true, message: "Application submitted successfully!", applicationId: application._id, applicationNo: application.applicationNo, application });
    } catch (error) {
        console.error("Application creation error:", error);
        const invalid = error.name === "ValidationError" || error.name === "CastError";
        res.status(invalid ? 400 : 500).json({ success: false, message: invalid ? "Please check the details you entered." : "Application submission failed. Please try again." });
    }
}

async function getApplications(req, res) {
    try {
        const filter = {};
        if (req.user.role !== "admin") filter.userId = req.user._id;
        const { status, q, scholarshipId } = req.query;
        if (status && status !== "All") filter.status = status;
        if (scholarshipId && mongoose.isValidObjectId(scholarshipId)) filter.scholarshipId = scholarshipId;
        if (q) {
            const rx = new RegExp(escapeRegex(q), "i");
            filter.$or = [{ applicationNo: rx }, { scholarship: rx }, { "personal.name": rx }, { "personal.email": rx }, { "academic.college": rx }];
        }
        const applications = await Application.find(filter).sort({ createdAt: -1 }).lean();

        const ids = applications.map(x => x._id);
        const [totals, verifiedCounts] = await Promise.all([
            Document.aggregate([{ $match: { applicationId: { $in: ids } } }, { $group: { _id: "$applicationId", n: { $sum: 1 } } }]),
            Document.aggregate([{ $match: { applicationId: { $in: ids }, verified: true } }, { $group: { _id: "$applicationId", n: { $sum: 1 } } }])
        ]);
        const vMap = Object.fromEntries(verifiedCounts.map(c => [String(c._id), c.n]));
        const byApp = Object.fromEntries(totals.map(c => [String(c._id), { total: c.n, verified: vMap[String(c._id)] || 0 }]));
        applications.forEach(x => { const c = byApp[String(x._id)]; x.docCount = c ? c.total : 0; x.docVerified = c ? c.verified : 0; });
        res.json(applications);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch applications." });
    }
}

async function getApplicationById(req, res) {
    try {
        const application = await Application.findById(req.params.id).lean();
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        if (req.user.role !== "admin" && String(application.userId) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: "You are not allowed to view this application." });
        }
        const [documents, scholarship, student] = await Promise.all([
            Document.find({ applicationId: application._id }).sort({ uploadedAt: -1 }).lean(),
            Scholarship.findById(application.scholarshipId).lean(),
            req.user.role === "admin" ? User.findById(application.userId).select("-password -resetTokenHash -resetTokenExpires").lean() : null
        ]);
        res.json({
            ...application,
            personal: application.personal || {}, academic: application.academic || {}, financial: application.financial || {}, other: application.other || {},
            history: application.history || [],
            documents, scholarshipDetails: scholarship, student
        });
    } catch (error) {
        console.error("Load application error:", error);
        res.status(500).json({ success: false, message: "Could not load this application. Please try again." });
    }
}

async function updateStatus(req, res) {
    try {
        const { status, remarks } = req.body;
        if (!STATUSES.includes(status)) return res.status(400).json({ success: false, message: "Invalid application status." });
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });

        const changed = application.status !== status;
        const note = String(remarks || "").trim();
        application.status = status;
        if (note) application.remarks = note;
        if (changed || note) application.history.push({ status, note: note || `Status changed to ${status}.`, by: req.user.name });
        await application.save();

        if (changed) {
            const type = status === "Approved" ? "success" : status === "Rejected" ? "error" : status === "Documents Pending" ? "warning" : "info";
            const text = {
                "Under Review": "is now under review",
                "Documents Pending": "needs additional documents. Please check the remarks and upload them",
                "Documents Verified": "has had its documents verified",
                "Approved": "has been approved. Congratulations!",
                "Rejected": "was not approved this time",
                "Submitted": "was marked as submitted"
            }[status];
            await notify(application.userId, `Application ${status.toLowerCase()}`,
                `Your ${application.scholarship} application (${application.applicationNo}) ${text}.${note ? " Note: " + note : ""}`, type, `/tracking.html?id=${application._id}`);
        }
        res.json({ success: true, message: "Application status updated successfully!", application });
        if (changed) {
            User.findById(application.userId).select("name email active").lean().then(u => { if (u && u.active !== false) emails.sendStatusChanged(u, application, status, note); }).catch(() => {});
        }
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: "Unable to update status." });
    }
}

async function withdraw(req, res) {
    try {
        const application = await Application.findById(req.params.id);
        if (!application) return res.status(404).json({ success: false, message: "Application not found." });
        if (String(application.userId) !== String(req.user._id)) return res.status(403).json({ success: false, message: "Access denied." });
        if (FINAL.includes(application.status)) return res.status(400).json({ success: false, message: "A decided application cannot be withdrawn." });

        const docs = await Document.find({ applicationId: application._id });
        docs.forEach(d => removeFile(d.filePath));
        await Document.deleteMany({ applicationId: application._id });
        await application.deleteOne();
        res.json({ success: true, message: "Application withdrawn." });
    } catch { res.status(400).json({ success: false, message: "Unable to withdraw application." }); }
}

// Everything the student dashboard needs in one request.
async function mySummary(req, res) {
    try {
        const mine = await Application.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
        const count = (...s) => mine.filter(x => s.includes(x.status)).length;
        const appliedIds = mine.map(x => x.scholarshipId);
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const [available, upcoming, unread] = await Promise.all([
            Scholarship.countDocuments({ status: "Active", deadline: { $gte: today } }),
            Scholarship.find({ status: "Active", deadline: { $gte: today }, _id: { $nin: appliedIds } }).sort({ deadline: 1 }).limit(4).lean(),
            Notification.countDocuments({ userId: req.user._id, read: false })
        ]);
        res.json({
            available,
            total: mine.length,
            pending: count("Submitted", "Under Review", "Documents Pending", "Documents Verified"),
            approved: count("Approved"),
            rejected: count("Rejected"),
            actionNeeded: mine.filter(x => x.status === "Documents Pending").map(x => ({ _id: x._id, applicationNo: x.applicationNo, scholarship: x.scholarship })),
            recent: mine.slice(0, 5),
            upcoming, unread
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Unable to load dashboard." });
    }
}

module.exports = { createApplication, getApplications, getApplicationById, updateStatus, withdraw, mySummary };
