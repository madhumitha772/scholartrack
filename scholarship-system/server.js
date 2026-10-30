const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const session = require("express-session");
const fs = require("fs");

dotenv.config({ path: path.join(__dirname, ".env") });

const { securityHeaders, bodyDefaults, rateLimit, requestLogger, IS_PROD } = require("./middleware/security");
const { connectDb } = require("./utils/db");
const MongoSessionStore = require("./utils/sessionStore");
const { bootstrap } = require("./utils/seed");
const User = require("./models/User");


const DEFAULT_SECRET = "change_this_to_a_long_random_string";
if (IS_PROD && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 24 || process.env.SESSION_SECRET === DEFAULT_SECRET)) {
    console.error("SESSION_SECRET must be set to a long random value (24+ characters) when NODE_ENV=production.");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");
// Set TRUST_PROXY=1 when running behind Nginx, Render, Railway, Heroku, etc. (needed for HTTPS cookies and real client IPs).
if (process.env.TRUST_PROXY) app.set("trust proxy", /^\d+$/.test(process.env.TRUST_PROXY) ? Number(process.env.TRUST_PROXY) : process.env.TRUST_PROXY);

app.use(securityHeaders);
if (IS_PROD || process.env.LOG_REQUESTS === "true") app.use(requestLogger);

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(bodyDefaults);

app.use(session({
    name: "scholartrack.sid",
    secret: process.env.SESSION_SECRET || DEFAULT_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    // MongoDB store keeps users signed in across restarts. Skipped by tests that run without a database.
    store: process.env.SESSION_STORE === "memory" ? undefined : new MongoSessionStore(),
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: IS_PROD && process.env.COOKIE_SECURE !== "false",
        maxAge: 1000 * 60 * 60 * 8
    }
}));

// Cross-site request protection for state-changing API calls: the browser must send an
// Origin (or Referer) that matches this site. Non-browser clients without an Origin are allowed.
app.use("/api", (req, res, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
    const source = req.get("origin") || req.get("referer");
    if (!source) return next();
    try {
        if (new URL(source).host === req.get("host")) return next();
    } catch (_) { /* fall through */ }
    res.status(403).json({ success: false, message: "Request blocked: cross-site request." });
});

fs.mkdirSync(path.join(__dirname, "uploads"), { recursive: true });

// Admin pages are only served to a signed-in administrator.
app.use("/admin", async (req, res, next) => {
    try {
        const user = req.session?.userId ? await User.findById(req.session.userId).select("role active") : null;
        if (user && user.role === "admin" && user.active !== false) return next();
        res.redirect("/admin-login.html?next=" + encodeURIComponent(req.originalUrl));
    } catch (error) { next(error); }
});
app.get("/admin", (req, res) => res.redirect("/admin/dashboard.html"));

app.use(express.static(path.join(__dirname, "public"), {
    maxAge: IS_PROD ? "1h" : 0,
    index: "index.html",
    dotfiles: "ignore",
    // Pages and scripts are always revalidated, so a browser never keeps running an old login script.
    setHeaders: (res, file) => { if (/\.(html|js)$/.test(file) && !file.includes(`${path.sep}vendor${path.sep}`)) res.setHeader("Cache-Control", "no-cache"); }
}));

// Rate limits (per client IP). Login attempts are also counted per e-mail address.
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 300, message: "Too many requests. Please slow down." });
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10,
    keyFn: (req) => `${req.ip}|${String(req.body?.email || "").trim().toLowerCase()}`,
    message: "Too many login attempts. Please wait 15 minutes and try again."
});
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 60, message: "Too many accounts created from this network. Try again later." });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 8, message: "Too many password reset requests. Try again later." });

app.use("/api", apiLimiter);
app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/admin/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);
app.use("/api/auth/forgot-password", resetLimiter);
app.use("/api/auth/admin/forgot-password", resetLimiter);
app.use("/api/auth/admin/reset-password", resetLimiter);
app.use("/api/auth/reset-password", resetLimiter);

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/profile", require("./routes/profileRoutes"));
app.use("/api/scholarships", require("./routes/scholarshipRoutes"));
app.use("/api/applications", require("./routes/applicationRoutes"));
app.use("/api", require("./routes/documentRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));

app.get("/api/test", (req, res) => res.json({ success: true, message: "Backend API is working!" }));
app.get("/api/health", (req, res) => {
    const connected = mongoose.connection.readyState === 1;
    res.status(connected ? 200 : 503).json({ success: connected, database: connected ? "connected" : "disconnected", uptime: Math.round(process.uptime()) });
});
app.use("/api", (req, res) => res.status(404).json({ success: false, message: "API route not found." }));
app.use((req, res) => res.status(404).sendFile(path.join(__dirname, "public/404.html")));

app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);
    if (err.type === "entity.parse.failed") return res.status(400).json({ success: false, message: "Malformed request body." });
    if (err.type === "entity.too.large") return res.status(413).json({ success: false, message: "Request is too large." });
    if (err.name === "CastError") return res.status(400).json({ success: false, message: "Invalid value in request." });
    if (err.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(err.errors).map(e => e.message)[0] || "Validation failed." });
    console.error("Unhandled server error:", err);
    res.status(500).json({ success: false, message: "Something went wrong on the server." });
});

module.exports = app;

if (require.main === module) {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not set. Copy .env.example to .env and set it.");
        process.exit(1);
    }
    connectDb(process.env.MONGO_URI)
        .then(async () => {
            console.log("MongoDB connected successfully!");
            await bootstrap();
            const mailer = require("./utils/mailer");
            console.log(mailer.describe());
            // Check the mail login now so a wrong password shows up here, not as silently missing emails.
            mailer.verifyConnection().then(r => {
                if (r.ok) {
                    console.log(`Email: connection test passed (${r.working}). Mail will be delivered.`);
                    Object.entries(r.results).forEach(([name, x]) => { if (!x.ok) console.warn(`Email: ${name.toUpperCase()} is not working and will be skipped. ${x.hint || x.error}`); else if (x.note) console.log(`Email: ${x.note}`); });
                } else if (!r.notConfigured) console.error(`Email: connection test FAILED. ${r.hint || r.error}`);
            }).catch(() => {});
            if (IS_PROD && !process.env.APP_URL && !process.env.RENDER_EXTERNAL_URL) console.warn("WARNING: set APP_URL to your public website address so e-mailed links point to the right place.");
            const server = app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));

            const shutdown = (signal) => {
                console.log(`${signal} received. Shutting down...`);
                server.close(async () => { await mongoose.disconnect(); process.exit(0); });
                setTimeout(() => process.exit(1), 10000).unref();
            };
            process.on("SIGTERM", () => shutdown("SIGTERM"));
            process.on("SIGINT", () => shutdown("SIGINT"));
        })
        .catch(error => {
            console.error("Startup failed:", error.message);
            console.error("Check MONGO_URI in your .env file (and your Atlas IP access list), or use a local MongoDB: mongodb://127.0.0.1:27017/scholarship_db");
            process.exit(1);
        });

    process.on("unhandledRejection", (reason) => console.error("Unhandled promise rejection:", reason));
}
