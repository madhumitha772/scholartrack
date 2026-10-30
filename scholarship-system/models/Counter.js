const mongoose = require("mongoose");

// Atomic counters (used for application numbers so they never collide).
const counterSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model("Counter", counterSchema);

// Returns startAt + n for the n-th call. A single atomic $inc keeps concurrent requests apart.
async function nextSequence(name, startAt = 1000) {
    const doc = await Counter.findOneAndUpdate(
        { _id: name },
        { $inc: { seq: 1 } },
        { returnDocument: "after", upsert: true }
    );
    return startAt + doc.seq;
}

module.exports = { Counter, nextSequence };
