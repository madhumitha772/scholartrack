// Course names are typed by people ("B.Tech", "btech", "B.E", "B.Sc Computer Science"). These helpers
// compare them loosely so a filter or eligibility check does not fail on punctuation or on B.E vs B.Tech.
const normalise = (c) => {
    const n = String(c || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return n === "be" ? "btech" : n === "me" ? "mtech" : n;
};

// True when a scholarship's course ("All", "B.Tech", "B.Sc") fits the student's course ("B.Sc Computer Science").
function courseMatches(scholarshipCourse, studentCourse) {
    if (!scholarshipCourse || scholarshipCourse === "All") return true;
    const a = normalise(scholarshipCourse), b = normalise(studentCourse);
    if (!a || !b) return false;
    return a === b || b.startsWith(a) || a.startsWith(b);
}

module.exports = { normalise, courseMatches };
