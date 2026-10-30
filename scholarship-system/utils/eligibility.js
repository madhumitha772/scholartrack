const { courseMatches } = require("./course");

// Checks a student's details against a scholarship's criteria.
// Missing student values are not treated as a failure; they are reported in `missing`.
function checkEligibility(scholarship, student = {}, now = new Date()) {
    const reasons = [];
    const missing = [];

    if (scholarship.status === "Closed") reasons.push("This scholarship is closed for applications.");
    else if (scholarship.deadline && new Date(scholarship.deadline).setHours(23, 59, 59, 999) < now.getTime()) {
        reasons.push("The application deadline has passed.");
    }

    const cgpa = student.cgpa;
    if (scholarship.minCgpa > 0) {
        if (cgpa === null || cgpa === undefined || cgpa === "") missing.push("CGPA");
        else if (Number(cgpa) < scholarship.minCgpa) reasons.push(`Minimum CGPA required is ${scholarship.minCgpa} (yours is ${cgpa}).`);
    }

    const income = student.familyIncome;
    if (scholarship.incomeLimit > 0) {
        if (income === null || income === undefined || income === "") missing.push("family income");
        else if (Number(income) > scholarship.incomeLimit) {
            reasons.push(`Family income must be at most ₹${Number(scholarship.incomeLimit).toLocaleString("en-IN")}.`);
        }
    }

    if (scholarship.category && scholarship.category !== "All") {
        if (!student.category) missing.push("category");
        else if (student.category !== scholarship.category) reasons.push(`Open to the ${scholarship.category} category only.`);
    }

    if (scholarship.gender && scholarship.gender !== "All") {
        if (!student.gender) missing.push("gender");
        else if (student.gender !== scholarship.gender) reasons.push(`Open to ${scholarship.gender} students only.`);
    }

    if (scholarship.course && scholarship.course !== "All") {
        if (!student.course) missing.push("course");
        else if (!courseMatches(scholarship.course, student.course)) reasons.push(`Open to ${scholarship.course} students.`);
    }

    if (scholarship.state && scholarship.state !== "All") {
        if (!student.state) missing.push("state");
        else if (student.state.toLowerCase() !== scholarship.state.toLowerCase()) reasons.push(`Open to students from ${scholarship.state}.`);
    }

    return { eligible: reasons.length === 0, reasons, missing: [...new Set(missing)] };
}

module.exports = { checkEligibility };
