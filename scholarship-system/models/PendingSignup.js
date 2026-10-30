const mongoose = require("mongoose");

// A sign-up that is waiting for the e-mail code. The real User account is only created after the
// code is entered, so an address nobody can read can never become an account.
const pendingSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    sends: { type: Number, default: 1 },
    lastSentAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },   // validated profile + hashed password
    expiresAt: { type: Date, required: true }
});
pendingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });      // MongoDB removes expired rows automatically

module.exports = mongoose.model("PendingSignup", pendingSchema);
