const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["student", "admin"], default: "student" },

    phone: { type: String, trim: true, default: "" },
    dob: { type: Date, default: null },
    gender: { type: String, enum: ["", "Female", "Male", "Other"], default: "" },
    address: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },

    college: { type: String, trim: true, default: "" },
    course: { type: String, trim: true, default: "" },
    department: { type: String, trim: true, default: "" },
    year: { type: Number, min: 1, max: 6, default: null },
    cgpa: { type: Number, min: 0, max: 10, default: null },

    category: { type: String, enum: ["", "General", "OBC", "SC", "ST", "EWS", "Minority"], default: "" },
    familyIncome: { type: Number, min: 0, default: null },

    active: { type: Boolean, default: true },
    resetTokenHash: { type: String, default: null },
    resetTokenExpires: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", userSchema);
