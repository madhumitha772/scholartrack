const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Document = require("../models/Document");
const Application = require("../models/Application");
const notify = require("../utils/notify");
const { requireAuth, requireAdmin } = require("../middleware/authMiddleware");

const { idParam } = require("../middleware/validateId");
const router = express.Router();
router.param("id", idParam);
router.param("docId", idParam);
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = [".pdf", ".jpg", ".jpeg", ".png"];
// Files are kept in memory just long enough to be checked, then stored in MongoDB.
// (Hosting platforms like Render wipe local disks on every deploy.)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => ALLOWED.includes(path.extname(file.originalname).toLowerCase())
        ? cb(null, true) : cb(new Error("Only PDF, JPG and PNG files are allowed."))
});
const uploadOne = (req, res, next) => upload.single("document")(req, res, (error) => {
    if (!error) return next();
    const message = error.code === "LIMIT_FILE_SIZE" ? "File is too large. The limit is 5 MB." : error.message;
    res.status(400).json({ success: false, message });
});

// The extension alone can be faked, so the first bytes of the saved file must match PDF, JPEG or PNG.
function looksLikeAllowedFile(file) {
    try {
        const head = file.buffer.subarray(0, 8);
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === ".pdf") return head.slice(0, 5).toString("latin1") === "%PDF-";
        if (ext === ".png") return head.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
        return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff; // .jpg / .jpeg
    } catch (_) { return false; }
}

const abs = (filePath) => path.join(__dirname, "..", filePath.replace(/^\//, ""));
const dropLegacyFile = (document) => { if (document.filePath) fs.unlink(abs(document.filePath), () => {}); };
const FINAL = ["Approved", "Rejected"];

async function loadApplication(req, res) {
    const application = await Application.findById(req.params.id);
    if (!application) { res.status(404).json({ success: false, message: "Application not found." }); return null; }
    if (req.user.role !== "admin" && String(application.userId) !== String(req.user._id)) {
        res.status(403).json({ success: false, message: "Access denied." }); return null;
    }
    return application;
}

router.use(["/applications/:id/documents", "/documents"], requireAuth);

// Upload (or replace) a document of a given type for the student's own application.
router.post("/applications/:id/documents", uploadOne, async (req, res) => {
    try {
        const application = await loadApplication(req, res);
        if (!application) {  return; }
        if (String(application.userId) !== String(req.user._id)) {
            
            return res.status(403).json({ success: false, message: "Only the applicant can upload documents." });
        }
        if (!req.file) return res.status(400).json({ success: false, message: "Please select a document." });
        if (!looksLikeAllowedFile(req.file)) {
            return res.status(400).json({ success: false, message: "That file is not a valid PDF, JPG or PNG." });
        }
        if (FINAL.includes(application.status)) {
            return res.status(400).json({ success: false, message: "This application has been decided. Documents can no longer be changed." });
        }

        const docType = String(req.body.docType || "Other").trim().slice(0, 60);
        const previous = await Document.findOne({ applicationId: application._id, docType });
        if (previous) { dropLegacyFile(previous); await previous.deleteOne(); }

        const document = await Document.create({
            applicationId: application._id, docType, originalName: path.basename(req.file.originalname).slice(0, 200),
            mimeType: { ".pdf": "application/pdf", ".png": "image/png" }[path.extname(req.file.originalname).toLowerCase()] || "image/jpeg",
            size: req.file.size, data: req.file.buffer
        });
        document.data = undefined; // never echo the file bytes back in the JSON response

        if (application.status === "Documents Pending") {
            application.status = "Under Review";
            application.history.push({ status: "Under Review", note: `Student uploaded ${docType}.`, by: req.user.name });
            await application.save();
        }
        res.status(201).json({ success: true, message: "Document uploaded successfully!", document });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message || "Document upload failed." });
    }
});

router.get("/applications/:id/documents", async (req, res) => {
    try {
        const application = await loadApplication(req, res);
        if (!application) return;
        res.json(await Document.find({ applicationId: application._id }).sort({ uploadedAt: -1 }));
    } catch { res.status(400).json({ success: false, message: "Unable to fetch documents." }); }
});

async function loadDocument(req, res) {
    const document = await Document.findById(req.params.docId);
    if (!document) { res.status(404).json({ success: false, message: "Document not found." }); return {}; }
    const application = await Application.findById(document.applicationId);
    if (!application || (req.user.role !== "admin" && String(application.userId) !== String(req.user._id))) {
        res.status(403).json({ success: false, message: "Access denied." }); return {};
    }
    return { document, application };
}

// Files are only served to the applicant and administrators.
router.get("/documents/:docId/file", async (req, res) => {
    try {
        const { document } = await loadDocument(req, res);
        if (!document) return;
        const withData = await Document.findById(document._id).select("+data");
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, no-store");
        const disposition = req.query.download === "1" ? "attachment" : "inline";
        const name = encodeURIComponent(document.originalName);
        if (withData?.data?.length) {
            res.setHeader("Content-Type", document.mimeType || "application/octet-stream");
            res.setHeader("Content-Disposition", `${disposition}; filename*=UTF-8''${name}`);
            return res.send(withData.data);
        }
        // Older uploads that were saved on disk.
        const file = document.filePath ? abs(document.filePath) : null;
        if (!file || !fs.existsSync(file)) return res.status(404).json({ success: false, message: "The file is missing on the server." });
        if (req.query.download === "1") return res.download(file, document.originalName);
        res.type(path.extname(file)).sendFile(file);
    } catch { res.status(400).json({ success: false, message: "Unable to open the document." }); }
});

router.delete("/documents/:docId", async (req, res) => {
    try {
        const { document, application } = await loadDocument(req, res);
        if (!document) return;
        if (req.user.role !== "admin" && FINAL.includes(application.status)) {
            return res.status(400).json({ success: false, message: "Documents cannot be removed after a decision." });
        }
        dropLegacyFile(document);
        await document.deleteOne();
        res.json({ success: true, message: "Document removed." });
    } catch { res.status(400).json({ success: false, message: "Unable to remove the document." }); }
});

router.put("/documents/:docId/verify", requireAdmin, async (req, res) => {
    try {
        const { document, application } = await loadDocument(req, res);
        if (!document) return;
        document.verified = Boolean(req.body.verified);
        await document.save();
        if (!document.verified) {
            await notify(application.userId, "Document needs attention", `Your ${document.docType} for ${application.scholarship} was not accepted. Please upload a clearer copy.`, "warning", `/tracking.html?id=${application._id}`);
        }
        res.json({ success: true, message: document.verified ? "Document marked as verified." : "Verification removed.", document });
    } catch { res.status(400).json({ success: false, message: "Unable to update the document." }); }
});

module.exports = router;
