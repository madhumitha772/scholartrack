const User = require("../models/User");
const Scholarship = require("../models/Scholarship");
const Application = require("../models/Application");
const Document = require("../models/Document");
const notify = require("../utils/notify");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const PENDING = ["Submitted", "Under Review", "Documents Pending", "Documents Verified"];

async function statusCounts() {
    const rows = await Application.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const map = Object.fromEntries(Application.STATUSES.map(s => [s, 0]));
    rows.forEach(r => { map[r._id] = r.count; });
    return map;
}

async function stats(req, res) {
    try {
        const today = new Date(new Date().setHours(0, 0, 0, 0));
        const [students, scholarships, activeScholarships, applications, byStatus, recent, closing] = await Promise.all([
            User.countDocuments({ role: "student" }),
            Scholarship.countDocuments(),
            Scholarship.countDocuments({ status: "Active", deadline: { $gte: today } }),
            Application.countDocuments(),
            statusCounts(),
            Application.find().sort({ createdAt: -1 }).limit(6).lean(),
            Scholarship.find({ status: "Active", deadline: { $gte: today } }).sort({ deadline: 1 }).limit(4).lean()
        ]);
        const pending = PENDING.reduce((sum, s) => sum + byStatus[s], 0);
        res.json({ students, scholarships, activeScholarships, applications, pending, approved: byStatus.Approved, rejected: byStatus.Rejected, byStatus, recent, closing });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Unable to load admin statistics." });
    }
}

async function students(req, res) {
    try {
        const filter = { role: "student" };
        if (req.query.q) {
            const rx = new RegExp(escapeRegex(req.query.q), "i");
            filter.$or = [{ name: rx }, { email: rx }, { college: rx }, { course: rx }];
        }
        const list = await User.find(filter).select("-password -resetTokenHash -resetTokenExpires").sort({ createdAt: -1 }).lean();
        const [totals, approved] = await Promise.all([
            Application.aggregate([{ $group: { _id: "$userId", n: { $sum: 1 } } }]),
            Application.aggregate([{ $match: { status: "Approved" } }, { $group: { _id: "$userId", n: { $sum: 1 } } }])
        ]);
        const total = Object.fromEntries(totals.map(c => [String(c._id), c.n]));
        const won = Object.fromEntries(approved.map(c => [String(c._id), c.n]));
        list.forEach(u => { u.applications = total[String(u._id)] || 0; u.approvedCount = won[String(u._id)] || 0; });
        res.json(list);
    } catch { res.status(500).json({ success: false, message: "Unable to load students." }); }
}

async function studentDetail(req, res) {
    try {
        const student = await User.findOne({ _id: req.params.id, role: "student" }).select("-password -resetTokenHash -resetTokenExpires").lean();
        if (!student) return res.status(404).json({ success: false, message: "Student not found." });
        const applications = await Application.find({ userId: student._id }).sort({ createdAt: -1 }).lean();
        res.json({ student, applications });
    } catch { res.status(400).json({ success: false, message: "Invalid student ID." }); }
}

async function setStudentActive(req, res) {
    try {
        const user = await User.findOneAndUpdate({ _id: req.params.id, role: "student" }, { active: Boolean(req.body.active) }, { new: true });
        if (!user) return res.status(404).json({ success: false, message: "Student not found." });
        res.json({ success: true, message: user.active ? "Account activated." : "Account deactivated.", user: { _id: user._id, name: user.name, email: user.email, active: user.active } });
    } catch { res.status(400).json({ success: false, message: "Unable to update the account." }); }
}

async function documents(req, res) {
    try {
        const filter = {};
        if (req.query.verified === "true") filter.verified = true;
        if (req.query.verified === "false") filter.verified = false;
        const docs = await Document.find(filter).sort({ uploadedAt: -1 }).limit(300).lean();
        const apps = await Application.find({ _id: { $in: docs.map(d => d.applicationId) } }).select("applicationNo scholarship personal.name status").lean();
        const byId = Object.fromEntries(apps.map(a => [String(a._id), a]));
        docs.forEach(d => { d.application = byId[String(d.applicationId)] || null; });
        let out = docs.filter(d => d.application);
        if (req.query.q) {
            const rx = new RegExp(escapeRegex(req.query.q), "i");
            out = out.filter(d => rx.test(d.originalName) || rx.test(d.docType) || rx.test(d.application.applicationNo) || rx.test(d.application.personal?.name || ""));
        }
        res.json(out);
    } catch { res.status(500).json({ success: false, message: "Unable to load documents." }); }
}

async function reports(req, res) {
    try {
        const since = new Date(); since.setMonth(since.getMonth() - 5); since.setDate(1); since.setHours(0, 0, 0, 0);
        const [byStatus, recentDates, scholarshipTotals, scholarshipApproved, byCategory, funds, avg, totalApps] = await Promise.all([
            statusCounts(),
            Application.find({ createdAt: { $gte: since } }).select("createdAt").lean(),
            Application.aggregate([{ $group: { _id: "$scholarship", total: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 8 }]),
            Application.aggregate([{ $match: { status: "Approved" } }, { $group: { _id: "$scholarship", n: { $sum: 1 } } }]),
            Application.aggregate([{ $group: { _id: "$other.category", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
            Application.aggregate([{ $match: { status: "Approved" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
            Application.find().select("academic.cgpa financial.familyIncome").lean(),
            Application.countDocuments()
        ]);
        const approvedBy = Object.fromEntries(scholarshipApproved.map(x => [x._id, x.n]));
        const byScholarship = scholarshipTotals.map(x => ({ _id: x._id, total: x.total, approved: approvedBy[x._id] || 0 }));

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() - i);
            const count = recentDates.filter(x => { const c = new Date(x.createdAt); return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth(); }).length;
            months.push({ label: d.toLocaleString("en-IN", { month: "short", year: "2-digit" }), count });
        }
        const decided = byStatus.Approved + byStatus.Rejected;
        res.json({
            totalApplications: totalApps,
            totalStudents: await User.countDocuments({ role: "student" }),
            byStatus, months,
            byScholarship: byScholarship.map(x => ({ name: x._id, total: x.total, approved: x.approved })),
            byCategory: byCategory.map(x => ({ name: x._id || "Not stated", count: x.count })),
            fundsApproved: funds[0]?.total || 0,
            approvalRate: decided ? Math.round((byStatus.Approved / decided) * 100) : 0,
            avgCgpa: avg.length ? Number((avg.reduce((t, x) => t + (x.academic?.cgpa || 0), 0) / avg.length).toFixed(2)) : 0,
            avgIncome: avg.length ? Math.round(avg.reduce((t, x) => t + (x.financial?.familyIncome || 0), 0) / avg.length) : 0
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Unable to build reports." });
    }
}

// Cells starting with = + - @ are prefixed with an apostrophe so Excel never runs them as formulas.
const csvCell = (v) => {
    let t = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(t) && !(typeof v === "number")) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
};

async function exportApplications(req, res) {
    try {
        const apps = await Application.find().sort({ createdAt: -1 }).lean();
        const head = ["Application No", "Student", "Email", "Phone", "College", "Course", "CGPA", "Family Income", "Category", "Scholarship", "Amount", "Status", "Applied On", "Last Updated"];
        const rows = apps.map(a => [a.applicationNo, a.personal?.name, a.personal?.email, a.personal?.phone, a.academic?.college, a.academic?.course,
            a.academic?.cgpa, a.financial?.familyIncome, a.other?.category, a.scholarship, a.amount, a.status,
            new Date(a.createdAt).toISOString().slice(0, 10), new Date(a.updatedAt).toISOString().slice(0, 10)]);
        const csv = [head, ...rows].map(r => r.map(csvCell).join(",")).join("\r\n");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="applications-${new Date().toISOString().slice(0, 10)}.csv"`);
        res.send("\ufeff" + csv);
    } catch { res.status(500).json({ success: false, message: "Unable to export applications." }); }
}

module.exports = { stats, students, studentDetail, setStudentActive, documents, reports, exportApplications };
