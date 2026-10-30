const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Scholarship = require("../models/Scholarship");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const { nextSequence } = require("../models/Counter");

const { MORE, slug } = require("./moreScholarships");

const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

const BASE = () => [
    {
        name: "Merit Excellence Scholarship", provider: "ABC Foundation", amount: 50000, deadline: inDays(45),
        description: "Annual support for undergraduate students with an outstanding academic record. The grant covers tuition and study material for one academic year.",
        eligibility: "CGPA of 8.0 or above and annual family income below ₹5,00,000.", minCgpa: 8.0, incomeLimit: 500000,
        category: "All", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Income Certificate", "Bonafide Certificate"],
        selectionCriteria: "Shortlisting on CGPA, followed by a document check. Ties are broken using family income.",
        contactEmail: "merit@abcfoundation.example", contactPhone: "044-2000-1100"
    },
    {
        name: "Women in Technology Grant", provider: "Nila Tech Trust", amount: 75000, deadline: inDays(30),
        description: "Encourages women pursuing engineering and computing degrees. Includes a laptop allowance and a mentorship programme with industry engineers.",
        eligibility: "Female students in B.E / B.Tech / B.Sc Computer Science with CGPA of 7.5 or above.", minCgpa: 7.5, incomeLimit: 800000,
        category: "All", course: "B.Tech", gender: "Female", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Bonafide Certificate"],
        selectionCriteria: "Academic score (60%), statement of purpose (20%), extracurricular activity (20%).",
        contactEmail: "grants@nilatech.example", contactPhone: "080-4100-2200"
    },
    {
        name: "Tamil Nadu First Graduate Scholarship", provider: "Directorate of Collegiate Education", amount: 30000, deadline: inDays(60),
        description: "Fee support for students who are the first in their family to attend college in Tamil Nadu.",
        eligibility: "Resident of Tamil Nadu, first graduate in the family, family income below ₹2,50,000.", minCgpa: 6.0, incomeLimit: 250000,
        category: "All", course: "All", gender: "All", state: "Tamil Nadu",
        requiredDocuments: ["ID Proof", "Income Certificate", "Bonafide Certificate", "First Graduate Certificate"],
        selectionCriteria: "Income verification and document check. Awarded to all eligible applicants while funds last.",
        contactEmail: "fg-scheme@tn.example", contactPhone: "044-2800-3300"
    },
    {
        name: "SC/ST Higher Education Support", provider: "Ministry of Social Justice (Sample)", amount: 60000, deadline: inDays(52),
        description: "Annual maintenance allowance and course-fee support for students from Scheduled Caste backgrounds.",
        eligibility: "SC category students with annual family income below ₹3,00,000.", minCgpa: 6.0, incomeLimit: 300000,
        category: "SC", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Income Certificate", "Community Certificate"],
        selectionCriteria: "Community and income certificate verification, followed by merit ranking.",
        contactEmail: "sc-support@gov.example", contactPhone: "011-2300-4400"
    },
    {
        name: "Sports Excellence Award", provider: "National Youth Sports Council", amount: 40000, deadline: inDays(21),
        description: "Recognises student athletes who have represented their college, district or state in recognised tournaments.",
        eligibility: "State-level participation or above in the last two years. CGPA of 6.5 or above.", minCgpa: 6.5, incomeLimit: 0,
        category: "All", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Sports Certificate"],
        selectionCriteria: "Level of achievement, consistency over two years and a short trial or interview.",
        contactEmail: "awards@nysc.example", contactPhone: "011-2600-5500"
    },
    {
        name: "Minority Merit-cum-Means Scholarship", provider: "Crescent Education Trust", amount: 45000, deadline: inDays(38),
        description: "Supports meritorious students from minority communities who need financial assistance to continue higher education.",
        eligibility: "Minority category students with at least 7.0 CGPA and family income below ₹4,50,000.", minCgpa: 7.0, incomeLimit: 450000,
        category: "Minority", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Income Certificate", "Community Certificate"],
        selectionCriteria: "Merit and means are weighed equally. A personal interview may be held.",
        contactEmail: "help@crescenttrust.example", contactPhone: "040-5500-6600"
    },
    {
        name: "Rural Achievers Scholarship", provider: "Gramodaya Foundation", amount: 25000, deadline: inDays(14),
        description: "A one-time grant for students from rural areas who have secured a seat in a professional course.",
        eligibility: "Rural background, family income below ₹3,50,000, CGPA of 7.0 or above.", minCgpa: 7.0, incomeLimit: 350000,
        category: "All", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Income Certificate", "Bonafide Certificate"],
        selectionCriteria: "Rural residence proof, academic score and income.",
        contactEmail: "apply@gramodaya.example", contactPhone: "0422-400-7700"
    },
    {
        name: "Engineering Innovators Fellowship", provider: "Orbit Labs", amount: 100000, deadline: inDays(75),
        description: "A fellowship for final-year engineering students building a project with real-world impact. Includes funding for prototypes and a summer internship.",
        eligibility: "Final-year B.Tech students with CGPA of 8.5 or above and a project proposal.", minCgpa: 8.5, incomeLimit: 0,
        category: "All", course: "B.Tech", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Bonafide Certificate", "Project Proposal"],
        selectionCriteria: "Project proposal review, followed by a panel interview.",
        contactEmail: "fellows@orbitlabs.example", contactPhone: "080-6600-8800"
    },
    {
        name: "EWS Education Support Grant", provider: "Bharat Shiksha Fund", amount: 35000, deadline: inDays(33),
        description: "Fee assistance for students from economically weaker sections across all streams.",
        eligibility: "EWS category students with annual family income below ₹2,00,000.", minCgpa: 6.0, incomeLimit: 200000,
        category: "EWS", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet", "Income Certificate"],
        selectionCriteria: "Income certificate verification and merit ranking.",
        contactEmail: "support@bharatshiksha.example", contactPhone: "022-4000-9900"
    },
    {
        name: "Founders' Legacy Scholarship (Closed)", provider: "Heritage Alumni Association", amount: 20000, deadline: inDays(-12), status: "Closed",
        description: "An alumni-funded scholarship for second-year students. The last round has closed; the next round opens next year.",
        eligibility: "Second-year students with CGPA of 7.0 or above.", minCgpa: 7.0, incomeLimit: 0,
        category: "All", course: "All", gender: "All", state: "All",
        requiredDocuments: ["ID Proof", "Marksheet"],
        selectionCriteria: "Academic record.", contactEmail: "alumni@heritage.example", contactPhone: "044-2900-1000"
    }
];

async function ensureAdmin() {
    const email = (process.env.ADMIN_EMAIL || "admin@scholartrack.com").toLowerCase();
    if (await User.findOne({ role: "admin" })) return null;
    const password = process.env.ADMIN_PASSWORD || "Admin@123";
    await User.create({ name: "System Administrator", email, password: await bcrypt.hash(password, 10), role: "admin" });
    console.log(`Admin account created: ${email} / ${password}`);
    return { email, password };
}

// Everything the app ships with: the 10 hand-written samples plus the extra catalogue.
const SCHOLARSHIPS = () => [...BASE(), ...MORE()];

// Runs on every start-up (unless AUTO_SEED=false):
//   - adds any sample scholarship that is missing (matched by name), so the catalogue is always full,
//   - re-opens sample scholarships whose deadline has passed, so searches never end up empty,
//   - never touches scholarships an administrator added, and never re-opens the "Closed" sample.
async function ensureScholarships() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let added = 0, refreshed = 0;
    for (const item of SCHOLARSHIPS()) {
        const seedKey = slug(item.name);
        const existing = await Scholarship.findOne({ $or: [{ seedKey }, { name: item.name }] });
        if (!existing) { await Scholarship.create({ ...item, seedKey }); added++; continue; }
        if (!existing.seedKey) { existing.seedKey = seedKey; await existing.save(); }
        const sampleIsClosed = item.status === "Closed";
        if (!sampleIsClosed && existing.status === "Active" && new Date(existing.deadline) < today) {
            existing.deadline = item.deadline; await existing.save(); refreshed++;
        }
    }
    if (added) console.log(`Scholarships: ${added} sample scholarship(s) added.`);
    if (refreshed) console.log(`Scholarships: ${refreshed} expired sample deadline(s) extended.`);
    return added + refreshed;
}

async function bootstrap() {
    await ensureAdmin();
    if (process.env.AUTO_SEED !== "false") await ensureScholarships();
}

// Optional demo data so the dashboards, charts and reports have something to show.
async function seedDemo() {
    await bootstrap();
    const people = [
        ["Madhumitha K", "student@demo.com", "Female", "B.Sc Computer Science", "VIT Vellore", 3, 8.7, "General", 350000, "Tamil Nadu"],
        ["Arun Prakash", "arun@demo.com", "Male", "B.Tech", "Anna University", 2, 7.9, "OBC", 280000, "Tamil Nadu"],
        ["Divya Lakshmi", "divya@demo.com", "Female", "B.Tech", "PSG Tech", 4, 9.1, "General", 420000, "Tamil Nadu"],
        ["Mohammed Faris", "faris@demo.com", "Male", "B.Com", "Loyola College", 3, 7.4, "Minority", 300000, "Tamil Nadu"],
        ["Keerthana S", "keerthana@demo.com", "Female", "B.Sc Mathematics", "Stella Maris College", 2, 8.2, "SC", 180000, "Tamil Nadu"],
        ["Rahul Verma", "rahul@demo.com", "Male", "B.Tech", "NIT Trichy", 4, 8.8, "General", 650000, "Tamil Nadu"],
        ["Sneha Reddy", "sneha@demo.com", "Female", "B.A Economics", "Presidency College", 1, 7.1, "EWS", 150000, "Tamil Nadu"]
    ];
    const hash = await bcrypt.hash("Student@123", 10);
    const users = [];
    for (const [name, email, gender, course, college, year, cgpa, category, familyIncome, state] of people) {
        let u = await User.findOne({ email });
        if (!u) u = await User.create({ name, email, password: hash, gender, course, college, year, cgpa, category, familyIncome, state, phone: "98400" + String(10000 + users.length * 137), dob: new Date(2003, users.length, 12), address: "Chennai, Tamil Nadu" });
        users.push(u);
    }
    const schol = await Scholarship.find({ status: "Active" });
    const pick = (name) => schol.find(s => s.name.startsWith(name));
    const plan = [
        [0, "Merit Excellence", "Approved"], [0, "Women in Technology", "Under Review"], [0, "Tamil Nadu First", "Documents Verified"],
        [1, "Merit Excellence", "Rejected"], [1, "Rural Achievers", "Submitted"],
        [2, "Merit Excellence", "Approved"], [2, "Women in Technology", "Approved"], [2, "Engineering Innovators", "Under Review"],
        [3, "Minority Merit", "Documents Pending"], [3, "Sports Excellence", "Submitted"],
        [4, "SC/ST Higher", "Approved"], [4, "Tamil Nadu First", "Under Review"],
        [5, "Engineering Innovators", "Documents Verified"], [5, "Sports Excellence", "Rejected"],
        [6, "EWS Education", "Under Review"], [6, "Tamil Nadu First", "Submitted"]
    ];
    const flow = ["Submitted", "Under Review", "Documents Verified", "Approved"];
    let created = 0;
    for (const [ui, sname, status] of plan) {
        const u = users[ui], s = pick(sname);
        if (!s || await Application.findOne({ userId: u._id, scholarshipId: s._id })) continue;
        const idx = status === "Rejected" ? 2 : status === "Documents Pending" ? 1 : flow.indexOf(status);
        const base = Date.now() - (created * 6 + 4) * 86400000;
        const history = flow.slice(0, idx + 1).map((st, i) => ({ status: st, note: i === 0 ? "Application submitted by student." : `Status changed to ${st}.`, by: i === 0 ? u.name : "System Administrator", at: new Date(base + i * 86400000) }));
        if (status === "Rejected") history.push({ status: "Rejected", note: "Does not meet the final selection cut-off.", by: "System Administrator", at: new Date(base + 3 * 86400000) });
        if (status === "Documents Pending") history.push({ status: "Documents Pending", note: "Community certificate is not legible. Please upload a clearer copy.", by: "System Administrator", at: new Date(base + 2 * 86400000) });
        await Application.create({
            applicationNo: `SCH${new Date().getFullYear()}${await nextSequence("applicationNo", 1000)}`,
            userId: u._id, scholarshipId: s._id, scholarship: s.name, amount: s.amount,
            personal: { name: u.name, email: u.email, phone: u.phone, dob: u.dob, address: u.address },
            academic: { college: u.college, course: u.course, department: "Computer Science", year: u.year, cgpa: u.cgpa, previousMarks: Math.round(u.cgpa * 10) },
            financial: { familyIncome: u.familyIncome, guardianOccupation: "Self-employed" },
            other: { category: u.category, achievements: "College merit certificate", extracurricular: "NSS volunteer" },
            status, remarks: history[history.length - 1].note, history, createdAt: new Date(base), updatedAt: new Date(base + 3 * 86400000)
        });
        if (status !== "Submitted") await Notification.create({ userId: u._id, title: `Application ${status.toLowerCase()}`, message: `Your ${s.name} application is now ${status}.`, type: status === "Approved" ? "success" : status === "Rejected" ? "error" : "info" });
        created++;
    }
    console.log(`Demo data ready: ${users.length} students, ${created} new applications. Student login: student@demo.com / Student@123`);
}

module.exports = { bootstrap, seedDemo, ensureAdmin, ensureScholarships, SCHOLARSHIPS };
