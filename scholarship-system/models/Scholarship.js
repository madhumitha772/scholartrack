const mongoose = require("mongoose");

const scholarshipSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    provider: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    amount: { type: Number, required: true, min: 0 },
    deadline: { type: Date, required: true },

    eligibility: { type: String, trim: true, default: "" },
    minCgpa: { type: Number, min: 0, max: 10, default: 0 },
    incomeLimit: { type: Number, min: 0, default: 0 },      // 0 = no limit
    category: { type: String, enum: ["All", "General", "OBC", "SC", "ST", "EWS", "Minority"], default: "All" },
    course: { type: String, trim: true, default: "All" },
    gender: { type: String, enum: ["All", "Female", "Male"], default: "All" },
    state: { type: String, trim: true, default: "All" },

    requiredDocuments: { type: [String], default: [] },
    selectionCriteria: { type: String, trim: true, default: "" },
    contactEmail: { type: String, trim: true, default: "" },
    contactPhone: { type: String, trim: true, default: "" },

    status: { type: String, enum: ["Active", "Closed"], default: "Active" },
    seedKey: { type: String, default: "", index: true },   // set only on built-in sample scholarships
    createdAt: { type: Date, default: Date.now }
});

scholarshipSchema.index({ name: "text", provider: "text", description: "text" });

module.exports = mongoose.model("Scholarship", scholarshipSchema);
