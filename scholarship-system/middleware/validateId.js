const mongoose = require("mongoose");

// Rejects malformed ObjectIds with a clean 400 instead of a Mongoose CastError (500).
function validateIdParams(...names) {
    return (req, res, next) => {
        for (const name of names) {
            if (req.params[name] !== undefined && !mongoose.isValidObjectId(req.params[name])) {
                return res.status(400).json({ success: false, message: "Invalid ID." });
            }
        }
        next();
    };
}

// Use with router.param("id", idParam) to validate a route parameter once for the whole router.
function idParam(req, res, next, value) {
    if (!mongoose.isValidObjectId(value)) return res.status(400).json({ success: false, message: "Invalid ID." });
    next();
}

module.exports = { validateIdParams, idParam };
