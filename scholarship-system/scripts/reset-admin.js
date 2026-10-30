// Usage: npm run reset-admin                      -> uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
//        npm run reset-admin -- you@mail.com NewPass123
// Use this when you cannot log in to the admin dashboard. It creates the admin account if it is
// missing, or resets its e-mail and password if it exists, so you can log in right away.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { connectDb } = require("../utils/db");
const User = require("../models/User");

(async () => {
    try {
        const email = String(process.argv[2] || process.env.ADMIN_EMAIL || "admin@scholartrack.com").trim().toLowerCase();
        const password = String(process.argv[3] || process.env.ADMIN_PASSWORD || "Admin@123");
        if (password.length < 8) throw new Error("Choose a password with at least 8 characters.");
        await connectDb(process.env.MONGO_URI);
        const hash = await bcrypt.hash(password, 10);
        const clash = await User.findOne({ email, role: { $ne: "admin" } });
        if (clash) throw new Error(`${email} is already used by a student account. Pick a different admin e-mail.`);
        let admin = await User.findOne({ role: "admin" });
        if (admin) { admin.email = email; admin.password = hash; await admin.save(); }
        else await User.create({ name: "System Administrator", email, password: hash, role: "admin" });
        console.log(`\nAdmin ready. Log in at /login.html with:\n  Email:    ${email}\n  Password: ${password}\n`);
    } catch (e) {
        console.error("Could not reset the admin:", e.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();
