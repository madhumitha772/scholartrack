const Scholarship = require("../models/Scholarship");
const Application = require("../models/Application");
const { checkEligibility } = require("../utils/eligibility");
const { courseMatches } = require("../utils/course");
const { ensureScholarships } = require("../utils/seed");

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function clean(body) {
    const data = { ...body };
    ["amount", "minCgpa", "incomeLimit"].forEach(key => { if (data[key] !== undefined && data[key] !== "") data[key] = Number(data[key]); else if (data[key] === "") data[key] = 0; });
    if (typeof data.requiredDocuments === "string") {
        data.requiredDocuments = data.requiredDocuments.split(/[\n,]/).map(s => s.trim()).filter(Boolean);
    }
    delete data._id; delete data.createdAt;
    return data;
}

// GET /api/scholarships?q=&category=&course=&gender=&state=&minCgpa=&income=&status=&sort=
async function list(req, res) {
    try {
        const { q, category, course, gender, state, cgpa, income, status, sort, open } = req.query;
        const filter = {};
        // Search every word the person typed against the most useful fields. All words must match;
        // if that finds nothing, any word may match, so a search always gets the closest results.
        const words = String(q || "").trim().split(/\s+/).filter(Boolean).slice(0, 8);
        const fields = ["name", "provider", "description", "eligibility", "category", "course", "state", "gender", "selectionCriteria"];
        const wordFilter = (w) => { const rx = new RegExp(escapeRegex(w), "i"); return { $or: fields.map(f => ({ [f]: rx })) }; };
        if (words.length) filter.$and = words.map(wordFilter);
        if (category && category !== "All") filter.category = { $in: [category, "All"] };
        if (course && course !== "All") {
            const known = await Scholarship.distinct("course");
            filter.course = { $in: [...known.filter(c => c && courseMatches(c, course)), "All"] };
        }
        if (gender && gender !== "All") filter.gender = { $in: [gender, "All"] };
        if (state && state !== "All") filter.state = { $in: [new RegExp("^" + escapeRegex(state) + "$", "i"), "All"] };
        const cgpaNum = Number(cgpa), incomeNum = Number(income);
        if (cgpa && !Number.isNaN(cgpaNum)) filter.minCgpa = { $lte: cgpaNum };
        if (income && !Number.isNaN(incomeNum)) filter.$and = [...(filter.$and || []), { $or: [{ incomeLimit: 0 }, { incomeLimit: { $gte: incomeNum } }] }];
        if (status && status !== "All") filter.status = status;
        if (open === "true") { filter.status = { $regex: /^Active$/i }; filter.deadline = { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }; }
        else if (!status || status === "All") { filter.status = { $regex: /^(Active|Closed)$/i }; }

        const sorts = { deadline: { deadline: 1 }, amount: { amount: -1 }, newest: { createdAt: -1 } };
        const sortBy = sorts[sort] || { createdAt: -1 };

        // First start-up safety net: an empty catalogue is filled with the sample scholarships.
        if (await Scholarship.estimatedDocumentCount() === 0 && process.env.AUTO_SEED !== "false") await ensureScholarships();

        let items = await Scholarship.find(filter).sort(sortBy);
        if (!items.length && words.length > 1) {
            const loose = { ...filter, $and: undefined, $or: undefined };
            delete loose.$and; delete loose.$or;
            if (filter.$and && filter.$and.length > words.length) loose.$and = filter.$and.slice(words.length);   // keep the income filter
            loose.$or = words.flatMap(w => wordFilter(w).$or);
            items = await Scholarship.find(loose).sort(sortBy);
        }
        res.json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Failed to fetch scholarships." });
    }
}

// Values used to build the filter drop-downs.
async function meta(req, res) {
    try {
        const [courses, states] = await Promise.all([Scholarship.distinct("course"), Scholarship.distinct("state")]);
        res.json({
            courses: courses.filter(c => c && c !== "All").sort(),
            states: states.filter(s => s && s !== "All").sort(),
            categories: ["General", "OBC", "SC", "ST", "EWS", "Minority"]
        });
    } catch { res.status(500).json({ success: false, message: "Failed to load filters." }); }
}

async function getOne(req, res) {
    try {
        const scholarship = await Scholarship.findById(req.params.id);
        if (!scholarship) return res.status(404).json({ success: false, message: "Scholarship not found." });

        const out = scholarship.toObject();
        out.applicantCount = await Application.countDocuments({ scholarshipId: scholarship._id });
        if (req.user && req.user.role === "student") {
            out.eligibility_check = checkEligibility(scholarship, req.user);
            const existing = await Application.findOne({ scholarshipId: scholarship._id, userId: req.user._id }).select("_id applicationNo status");
            out.myApplication = existing;
        }
        res.json(out);
    } catch { res.status(400).json({ success: false, message: "Invalid scholarship ID." }); }
}

async function create(req, res) {
    try {
        const scholarship = await Scholarship.create(clean(req.body));
        res.status(201).json({ success: true, message: "Scholarship added successfully.", scholarship });
    } catch (error) { res.status(400).json({ success: false, message: error.message || "Failed to add scholarship." }); }
}

async function update(req, res) {
    try {
        const scholarship = await Scholarship.findByIdAndUpdate(req.params.id, clean(req.body), { new: true, runValidators: true });
        if (!scholarship) return res.status(404).json({ success: false, message: "Scholarship not found." });
        res.json({ success: true, message: "Scholarship updated successfully.", scholarship });
    } catch (error) { res.status(400).json({ success: false, message: error.message || "Failed to update scholarship." }); }
}

async function remove(req, res) {
    try {
        const used = await Application.countDocuments({ scholarshipId: req.params.id });
        if (used > 0) {
            return res.status(409).json({ success: false, message: `${used} application(s) exist for this scholarship. Close it instead of deleting.` });
        }
        const scholarship = await Scholarship.findByIdAndDelete(req.params.id);
        if (!scholarship) return res.status(404).json({ success: false, message: "Scholarship not found." });
        res.json({ success: true, message: "Scholarship deleted successfully." });
    } catch { res.status(400).json({ success: false, message: "Failed to delete scholarship." }); }
}

module.exports = { list, meta, getOne, create, update, remove };
