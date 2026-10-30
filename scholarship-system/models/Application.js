const mongoose = require("mongoose");

const STATUSES = ["Submitted", "Under Review", "Documents Pending", "Documents Verified", "Approved", "Rejected"];

const historySchema = new mongoose.Schema({
    status: { type: String, enum: STATUSES, required: true },
    note: { type: String, default: "" },
    by: { type: String, default: "System" },
    at: { type: Date, default: Date.now }
}, { _id: false });

const applicationSchema = new mongoose.Schema({
    applicationNo: { type: String, unique: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    scholarshipId: { type: mongoose.Schema.Types.ObjectId, ref: "Scholarship", required: true },
    scholarship: { type: String, required: true, trim: true },       // name snapshot
    amount: { type: Number, default: 0 },                            // amount snapshot

    personal: {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, lowercase: true, trim: true },
        phone: { type: String, required: true, trim: true },
        dob: { type: Date, default: null },
        address: { type: String, trim: true, default: "" }
    },
    academic: {
        college: { type: String, required: true, trim: true },
        course: { type: String, required: true, trim: true },
        department: { type: String, trim: true, default: "" },
        year: { type: Number, min: 1, max: 6, default: 1 },
        cgpa: { type: Number, required: true, min: 0, max: 10 },
        previousMarks: { type: Number, min: 0, max: 100, default: null }
    },
    financial: {
        familyIncome: { type: Number, required: true, min: 0 },
        guardianOccupation: { type: String, trim: true, default: "" }
    },
    other: {
        category: { type: String, trim: true, default: "General" },
        achievements: { type: String, trim: true, default: "" },
        extracurricular: { type: String, trim: true, default: "" }
    },

    status: { type: String, enum: STATUSES, default: "Submitted" },
    remarks: { type: String, default: "" },
    history: { type: [historySchema], default: [] },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

applicationSchema.index({ userId: 1, scholarshipId: 1 }, { unique: true });

applicationSchema.pre("save", function () {
    this.updatedAt = new Date();
});

module.exports = mongoose.model("Application", applicationSchema);
module.exports.STATUSES = STATUSES;
