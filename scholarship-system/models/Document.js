const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema({
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application", required: true, index: true },
    docType: { type: String, default: "Other", trim: true },
    originalName: { type: String, required: true },
    fileName: { type: String, default: "" },
    filePath: { type: String, default: "" },          // only set for files saved by older versions
    data: { type: Buffer, select: false },            // file bytes live in MongoDB so they survive redeploys
    mimeType: { type: String, default: "" },
    size: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Document", documentSchema);
