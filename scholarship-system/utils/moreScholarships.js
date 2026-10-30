// Extra sample scholarships so searches and filters always have plenty to show.
// Providers and schemes are fictional sample data for the demo; deadlines are relative to "today".
const inDays = (n) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d; };

// [name, provider, amount, daysLeft, minCgpa, incomeLimit(0=none), category, course, gender, state, description, extraDocs]
const ROWS = [
    // ---- Engineering / technology ----
    ["Future Engineers Merit Award", "Vikram Sarabhai Trust", 80000, 55, 8.0, 600000, "All", "B.Tech", "All", "All", "Merit award for engineering students with an outstanding academic record. Covers tuition and lab fees.", []],
    ["Women in Engineering Fellowship", "Kalpana Chawla Memorial Fund", 90000, 48, 7.5, 800000, "All", "B.Tech", "Female", "All", "Fellowship for women in engineering streams, including a mentoring programme and a conference travel grant.", []],
    ["Digital India Coders Scholarship", "Bharat Digital Foundation", 45000, 40, 7.0, 500000, "All", "BCA", "All", "All", "Supports BCA students who build open-source or community software projects.", ["Project Portfolio"]],
    ["Cyber Security Aspirants Grant", "SecureNet Academy", 55000, 62, 7.5, 0, "All", "B.Sc Computer Science", "All", "All", "Grant for computer science students pursuing cyber security certifications and capture-the-flag training.", ["Statement of Purpose"]],
    ["M.Tech Research Support Grant", "Institute Alumni Research Trust", 120000, 70, 8.0, 0, "All", "M.Tech", "All", "All", "Research stipend for first-year M.Tech students working on a funded thesis.", ["Research Proposal"]],
    ["MCA Software Talent Scholarship", "Nexus Software Council", 60000, 35, 7.5, 600000, "All", "MCA", "All", "All", "Tuition support for MCA students with strong programming and problem-solving skills.", []],
    ["Diploma Engineers Progress Scholarship", "Polytechnic Welfare Society", 20000, 28, 6.5, 300000, "All", "Diploma", "All", "All", "Helps diploma students complete their course and move on to lateral-entry degrees.", []],
    ["Robotics and AI Innovators Award", "Orbit Labs", 95000, 80, 8.0, 0, "All", "B.Tech", "All", "All", "Funding for student teams building robotics or AI projects with a clear social benefit.", ["Project Proposal"]],
    ["Core Engineering Fee Waiver", "Mechanical and Civil Engineers Guild", 35000, 44, 6.5, 400000, "All", "B.E", "All", "All", "Partial fee waiver for students of mechanical, civil and electrical engineering.", []],
    ["Girls Who Code Scholarship", "Nila Tech Trust", 50000, 33, 7.0, 700000, "All", "BCA", "Female", "All", "Encourages girls to take up computing degrees with fee support and a laptop grant.", []],
    // ---- Science, commerce, arts, management ----
    ["Young Scientists Scholarship", "National Science Promotion Society", 60000, 58, 8.0, 0, "All", "B.Sc", "All", "All", "For B.Sc students with a strong record in physics, chemistry, mathematics or life sciences.", []],
    ["Mathematics Olympiad Achievers Award", "Ramanujan Mathematical Circle", 40000, 50, 7.5, 0, "All", "B.Sc", "All", "All", "Rewards students who have performed well in mathematics competitions or research camps.", ["Achievement Certificate"]],
    ["M.Sc Research Fellowship", "Curie Science Foundation", 100000, 66, 8.0, 0, "All", "M.Sc", "All", "All", "Monthly fellowship for M.Sc students taking up a laboratory or field project.", ["Research Proposal"]],
    ["Commerce Toppers Scholarship", "Chartered Learners Trust", 30000, 37, 7.5, 500000, "All", "B.Com", "All", "All", "Support for B.Com students aiming for CA, CMA or CS professional courses.", []],
    ["M.Com Excellence Grant", "Finance Educators Forum", 35000, 52, 7.0, 500000, "All", "M.Com", "All", "All", "A grant for postgraduate commerce students with a strong academic record.", []],
    ["Future Managers MBA Scholarship", "Indian Management Association (Sample)", 150000, 90, 7.5, 1000000, "All", "MBA", "All", "All", "Partial tuition waiver for first-year MBA students.", ["Statement of Purpose"]],
    ["Women Leaders in Business Award", "Shakti Business Network", 110000, 72, 7.0, 1000000, "All", "MBA", "Female", "All", "Scholarship and mentoring for women pursuing a management degree.", []],
    ["BBA Entrepreneurs Grant", "Startup Bharat Trust", 40000, 46, 7.0, 600000, "All", "BBA", "All", "All", "Seed support for BBA students who run or plan a small business.", ["Business Plan"]],
    ["Humanities and Social Sciences Scholarship", "Tagore Cultural Foundation", 25000, 41, 7.0, 400000, "All", "B.A", "All", "All", "For B.A students in history, economics, sociology, political science and languages.", []],
    ["Literature and Languages Award", "Thiruvalluvar Literary Society", 20000, 36, 7.0, 0, "All", "B.A", "All", "All", "Encourages students of Tamil, English, Hindi and other languages with a writing sample.", ["Writing Sample"]],
    ["Journalism and Media Scholarship", "Free Press Education Trust", 30000, 53, 7.0, 500000, "All", "B.A", "All", "All", "Support for students of journalism, mass communication and media studies.", ["Portfolio"]],
    // ---- Medical and pharmacy ----
    ["Future Doctors Scholarship", "Jeevan Health Foundation", 120000, 64, 7.5, 700000, "All", "MBBS", "All", "All", "Helps MBBS students from modest backgrounds meet the cost of medical education.", []],
    ["Women in Medicine Grant", "Muthulakshmi Reddy Memorial Trust", 100000, 57, 7.0, 800000, "All", "MBBS", "Female", "All", "Grant for women medical students, including a book and equipment allowance.", []],
    ["Pharmacy Excellence Scholarship", "Pharma Educators Alliance", 45000, 43, 7.5, 600000, "All", "B.Pharm", "All", "All", "For B.Pharm students with excellent practical and theory scores.", []],
    // ---- Category based ----
    ["OBC Higher Education Scholarship", "Backward Classes Welfare Board (Sample)", 40000, 49, 6.0, 450000, "OBC", "All", "All", "All", "Annual fee support for OBC students in any recognised degree course.", ["Community Certificate"]],
    ["OBC Women Achievers Grant", "Savitribai Phule Education Fund", 50000, 39, 6.5, 450000, "OBC", "All", "Female", "All", "Supports OBC women who are continuing higher education.", ["Community Certificate"]],
    ["SC Post-Matric Merit Scholarship", "Ambedkar Education Trust", 55000, 61, 6.0, 350000, "SC", "All", "All", "All", "Merit-cum-means support for SC students after Class 12.", ["Community Certificate"]],
    ["SC Engineering and Medical Support", "Ambedkar Education Trust", 85000, 74, 7.0, 400000, "SC", "B.Tech", "All", "All", "Additional support for SC students in engineering and professional courses.", ["Community Certificate"]],
    ["ST Tribal Students Scholarship", "Tribal Welfare Foundation", 55000, 56, 6.0, 350000, "ST", "All", "All", "All", "Maintenance and fee support for students from Scheduled Tribe communities.", ["Community Certificate"]],
    ["ST Girls Higher Education Grant", "Tribal Welfare Foundation", 60000, 47, 6.0, 350000, "ST", "All", "Female", "All", "Encourages tribal girls to complete a degree with a monthly allowance.", ["Community Certificate"]],
    ["EWS Merit Scholarship", "Bharat Shiksha Fund", 45000, 54, 7.0, 250000, "EWS", "All", "All", "All", "Merit support for students from economically weaker sections.", ["EWS Certificate"]],
    ["EWS Engineering Aid", "Bharat Shiksha Fund", 65000, 68, 6.5, 250000, "EWS", "B.Tech", "All", "All", "Fee aid for EWS students in engineering and technology courses.", ["EWS Certificate"]],
    ["Minority Girls Education Scholarship", "Crescent Education Trust", 50000, 42, 6.5, 400000, "Minority", "All", "Female", "All", "Supports girls from minority communities to continue in college.", ["Community Certificate"]],
    ["Minority Professional Courses Grant", "Crescent Education Trust", 70000, 59, 7.0, 500000, "Minority", "B.Tech", "All", "All", "A grant for minority students in engineering, medicine and management.", ["Community Certificate"]],
    ["General Category Merit Scholarship", "Education for All Foundation", 30000, 38, 8.5, 500000, "General", "All", "All", "All", "Rewards top-ranking students in any degree programme.", []],
    // ---- State based ----
    ["Tamil Nadu Pudhumai Penn Support", "Tamil Nadu Women Education Scheme (Sample)", 36000, 45, 6.0, 300000, "All", "All", "Female", "Tamil Nadu", "Monthly support for girls from Tamil Nadu who studied in government schools.", []],
    ["Tamil Nadu Engineering Toppers Award", "Anna Education Trust", 70000, 63, 8.0, 600000, "All", "B.E", "All", "Tamil Nadu", "Merit award for Tamil Nadu students in engineering colleges.", []],
    ["Tamil Nadu Arts and Science Merit Grant", "Kamarajar Education Fund", 25000, 34, 7.0, 300000, "All", "B.Sc", "All", "Tamil Nadu", "Support for students in arts and science colleges across Tamil Nadu.", []],
    ["Kerala Merit Scholarship", "Kerala Higher Education Trust", 40000, 51, 7.5, 400000, "All", "All", "All", "Kerala", "For students from Kerala who have a strong academic record.", []],
    ["Karnataka Student Welfare Scholarship", "Karnataka Education Society", 35000, 46, 6.5, 350000, "All", "All", "All", "Karnataka", "Fee support for Karnataka residents in recognised colleges.", []],
    ["Andhra Pradesh Vidya Deevena Grant", "Andhra Education Mission (Sample)", 38000, 40, 6.0, 250000, "All", "All", "All", "Andhra Pradesh", "Tuition support for students from low-income families in Andhra Pradesh.", []],
    ["Telangana Scholars Fund", "Telangana Youth Education Trust", 42000, 55, 6.5, 300000, "All", "All", "All", "Telangana", "Helps Telangana students meet college fees and exam costs.", []],
    ["Maharashtra Talent Scholarship", "Sahyadri Education Foundation", 45000, 60, 7.0, 400000, "All", "All", "All", "Maharashtra", "Supports talented students from Maharashtra in any degree course.", []],
    ["Delhi Students Merit Award", "Capital Education Trust", 30000, 32, 7.5, 500000, "All", "All", "All", "Delhi", "Merit award for students studying in Delhi colleges.", []],
    ["Uttar Pradesh Pratibha Scholarship", "Awadh Education Society", 28000, 43, 6.5, 300000, "All", "All", "All", "Uttar Pradesh", "Support for meritorious students from Uttar Pradesh.", []],
    ["West Bengal Kanyashree Higher Study Grant", "Bengal Girls Education Fund (Sample)", 32000, 52, 6.0, 250000, "All", "All", "Female", "West Bengal", "Encourages girls in West Bengal to take up higher education.", []],
    // ---- Special and general ----
    ["First Generation Learners Award", "Aadhaar Education Foundation", 40000, 36, 6.0, 300000, "All", "All", "All", "All", "For students who are the first in their family to attend college.", ["First Graduate Certificate"]],
    ["Rural Women Achievers Grant", "Gramodaya Foundation", 30000, 29, 6.5, 300000, "All", "All", "Female", "All", "A grant for women from rural areas in professional or arts and science courses.", []],
    ["Differently-Abled Students Support Scholarship", "Samarth Inclusion Trust", 60000, 65, 5.5, 600000, "All", "All", "All", "All", "Assistive devices and fee support for students with a benchmark disability.", ["Disability Certificate"]],
    ["Orphan and Single-Parent Students Aid", "Anbu Illam Charitable Trust", 35000, 31, 6.0, 250000, "All", "All", "All", "All", "Helps students who have lost a parent or are raised by a single parent.", ["Parent Death Certificate"]],
    ["Armed Forces Wards Scholarship", "Veer Parivar Education Fund", 50000, 70, 6.5, 0, "All", "All", "All", "All", "For children of serving or retired defence personnel.", ["Service Certificate"]],
    ["NSS and NCC Volunteers Award", "National Service Alumni Trust", 20000, 27, 6.5, 0, "All", "All", "All", "All", "Recognises students with strong NSS or NCC service records.", ["NSS/NCC Certificate"]],
    ["Cultural Arts Talent Scholarship", "Kalakshetra Arts Council", 25000, 41, 6.0, 0, "All", "All", "All", "All", "For students in music, dance, theatre and fine arts with a performance record.", ["Portfolio"]],
    ["Environment Champions Scholarship", "Green Earth Foundation", 30000, 58, 7.0, 0, "All", "All", "All", "All", "For students leading campus or community environment projects.", ["Project Report"]],
    ["Social Entrepreneurs Scholarship", "Seva Ventures", 45000, 76, 7.0, 0, "All", "All", "All", "All", "Seed support for students building a venture that solves a local problem.", ["Business Plan"]],
    ["Final Year Completion Grant", "Heritage Alumni Association", 25000, 25, 6.5, 400000, "All", "All", "All", "All", "A one-time grant that helps final-year students clear pending fees and finish their degree.", ["Fee Receipt"]],
    ["Study Abroad Preparation Grant", "Global Horizons Trust", 70000, 85, 8.0, 0, "All", "All", "All", "All", "Covers GRE, IELTS and application fees for students who plan to study abroad.", ["Statement of Purpose"]],
    ["Sports Women Champions Award", "National Youth Sports Council", 45000, 33, 6.5, 0, "All", "All", "Female", "All", "Rewards women athletes who have represented their college, district or state.", ["Sports Certificate"]],
    ["Top Ranker Merit Scholarship", "ABC Foundation", 25000, 22, 9.0, 0, "All", "All", "All", "All", "A one-time award for students with a CGPA of 9.0 or above.", []]
];

const slug = (n) => String(n).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const rupees = (n) => "₹" + Number(n).toLocaleString("en-IN");

function build([name, provider, amount, days, minCgpa, incomeLimit, category, course, gender, state, description, extraDocs]) {
    const parts = [];
    if (minCgpa > 0) parts.push(`CGPA of ${minCgpa} or above`);
    if (incomeLimit > 0) parts.push(`annual family income up to ${rupees(incomeLimit)}`);
    if (category !== "All") parts.push(`${category} category`);
    if (gender !== "All") parts.push(`${gender.toLowerCase()} students`);
    if (course !== "All") parts.push(`${course} course`);
    if (state !== "All") parts.push(`resident of ${state}`);
    const docs = ["ID Proof", "Marksheet"];
    if (incomeLimit > 0) docs.push("Income Certificate");
    docs.push("Bonafide Certificate", ...extraDocs);
    const slugEmail = slug(provider).replace(/-sample$/, "").slice(0, 24);
    return {
        name, provider, amount, deadline: inDays(days), description,
        eligibility: parts.length ? `Requires ${parts.join(", ")}.` : "Open to all students.",
        minCgpa, incomeLimit, category, course, gender, state,
        requiredDocuments: [...new Set(docs)],
        selectionCriteria: "Document verification followed by merit ranking. Awarded to eligible applicants while funds last.",
        contactEmail: `help@${slugEmail}.example`, contactPhone: "044-4000-" + String(1000 + (slug(name).length * 37) % 9000)
    };
}

const MORE = () => ROWS.map(build);
module.exports = { MORE, slug, inDays, ROWS };
