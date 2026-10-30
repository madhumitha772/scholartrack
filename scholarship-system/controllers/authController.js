const crypto = require("crypto");
const dns = require("dns").promises;
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PendingSignup = require("../models/PendingSignup");
const notify = require("../utils/notify");
const { mailEnabled } = require("../utils/mailer");
const emails = require("../utils/emails");

const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Minority"];
const GENDERS = ["Female", "Male", "Other"];
// Used to keep response time similar whether or not an account exists.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password-1", 10);

// New session id on every sign-in (prevents session fixation).
function startSession(req, user) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => {
            if (error) return reject(error);
            req.session.userId = user._id.toString();
            req.session.save(err => (err ? reject(err) : resolve()));
        });
    });
}

function appBaseUrl(req) {
    const configured = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
    if (configured) return configured.replace(/\/+$/, "");
    return `${req.protocol}://${req.get("host")}`;
}

// Creates a one-time reset link (valid 30 minutes) and stores only its hash.
async function createResetLink(user, req, page = "reset-password.html") {
    const token = crypto.randomBytes(24).toString("hex");
    user.resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    user.resetTokenExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    return `${appBaseUrl(req)}/${page}?token=${token}`;
}

const publicUser = (user) => ({
    id: user._id, name: user.name, email: user.email, role: user.role
});

function passwordProblem(password) {
    if (password.length < 8) return "Password must contain at least 8 characters.";
    if (password.length > 72) return "Password must be at most 72 characters.";
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must include at least one letter and one number.";
    return null;
}

const num = (value) => (value === "" || value === null || value === undefined ? null : Number(value));

const CODE_MINUTES = 10;
const RESEND_SECONDS = 30;
const MAX_CODE_ATTEMPTS = 5;
const MAX_SENDS = 6;

const hashCode = (email, code) => crypto.createHmac("sha256", process.env.SESSION_SECRET || "scholartrack").update(`${email}:${code}`).digest("hex");

// Rejects domains that cannot receive mail at all (typos such as "gmial.con"). A real mailbox on a
// real domain can only be proven by the e-mailed code, which is what the next steps do.
async function domainProblem(email) {
    if (String(process.env.EMAIL_DOMAIN_CHECK || "").toLowerCase() === "off") return null;
    const domain = email.split("@").pop();
    const bad = "This email domain does not exist or cannot receive email. Check the email address.";
    // Only a definite "no such domain" answer rejects the address. Any other DNS trouble (timeouts,
    // blocked resolvers, SERVFAIL) is the network's problem, so the sign-up continues and the
    // e-mailed code does the real check.
    const NOT_FOUND = ["ENOTFOUND", "ENODATA"];
    try {
        const mx = await dns.resolveMx(domain);
        if (mx && mx.length) return null;
    } catch (mxError) {
        if (!NOT_FOUND.includes(mxError.code)) { console.warn("Email domain lookup failed (allowing sign-up):", mxError.code || mxError.message); return null; }
    }
    try { await dns.resolve(domain); return null; }
    catch (aError) {
        if (NOT_FOUND.includes(aError.code)) return bad;
        console.warn("Email domain lookup failed (allowing sign-up):", aError.code || aError.message);
        return null;
    }
}

// Validates the sign-up form. Returns { error } or { data } (data holds the cleaned profile).
function validateRegistration(b) {
    const name = String(b.name || "").trim();
    const email = String(b.email || "").trim().toLowerCase();
    const password = String(b.password || "");
    const bad = (message) => ({ error: message });

    if (!name || !email || !password) return bad("Name, email and password are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return bad("Enter a valid email address.");
    const problem = passwordProblem(password);
    if (problem) return bad(problem);
    if (b.confirmPassword !== undefined && b.confirmPassword !== password) return bad("Passwords do not match.");
    if (b.phone && !/^[0-9+\-\s]{10,15}$/.test(String(b.phone).trim())) return bad("Enter a valid phone number.");
    const cgpa = num(b.cgpa);
    if (cgpa !== null && (Number.isNaN(cgpa) || cgpa < 0 || cgpa > 10)) return bad("CGPA must be between 0 and 10.");
    if (name.length < 2 || name.length > 100) return bad("Enter your full name.");
    if (b.category && !CATEGORIES.includes(b.category)) return bad("Invalid category.");
    if (b.gender && !GENDERS.includes(b.gender)) return bad("Invalid gender.");
    const year = num(b.year);
    if (year !== null && (!Number.isInteger(year) || year < 1 || year > 6)) return bad("Year must be between 1 and 6.");
    const income = num(b.familyIncome);
    if (income !== null && (Number.isNaN(income) || income < 0)) return bad("Family income must be a positive number.");
    if (b.dob) {
        const dob = new Date(b.dob);
        if (Number.isNaN(dob.getTime()) || dob > new Date()) return bad("Enter a valid date of birth.");
    }
    return {
        data: {
            name, email, role: "student",
            phone: String(b.phone || "").trim(), dob: b.dob || null, gender: b.gender || "",
            address: String(b.address || "").trim(),
            college: String(b.college || "").trim(), course: String(b.course || "").trim(), department: String(b.department || "").trim(),
            year, cgpa, category: b.category || "", familyIncome: income,
            state: String(b.state || "").trim()
        },
        password
    };
}

// Creates a fresh 6-digit code, stores its hash and e-mails it. Returns an { status, body } to send back.
async function issueCode(pending, name) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    pending.codeHash = hashCode(pending.email, code);
    pending.attempts = 0;
    pending.lastSentAt = new Date();
    pending.expiresAt = new Date(Date.now() + CODE_MINUTES * 60 * 1000);
    pending.markModified("payload");
    await pending.save();

    if (!mailEnabled()) {
        if (process.env.DEV_SHOW_CODE === "true" && process.env.NODE_ENV !== "production") {
            console.log(`\n[ScholarTrack] E-mail is not configured. Verification code for ${pending.email}: ${code}\n`);
            return { ok: true };
        }
        await pending.deleteOne();
        return { ok: false, status: 503, message: "The server cannot send e-mail right now, so the address cannot be verified. Please contact the administrator." };
    }
    const result = await emails.sendVerificationCode(pending.email, name, code, CODE_MINUTES);
    if (result.ok) return { ok: true };

    await pending.deleteOne();
    if (result.rejected) return { ok: false, status: 400, message: "This email address does not exist or cannot receive email. Check the spelling and try again." };
    // On your own computer show the real reason in the browser too; on a live site keep it generic.
    const detail = process.env.NODE_ENV !== "production" && result.hint ? ` (Server says: ${result.hint})` : "";
    return { ok: false, status: 502, message: "We could not send the verification email. Check that the address is correct, or try again in a minute." + detail };
}

// Step 1: validate the form, then e-mail a code. No account exists yet.
async function register(req, res) {
    try {
        const checked = validateRegistration(req.body || {});
        if (checked.error) return res.status(400).json({ success: false, message: checked.error });
        const { data, password } = checked;

        if (await User.exists({ email: data.email })) return res.status(409).json({ success: false, message: "An account with this email already exists." });
        const domainError = await domainProblem(data.email);
        if (domainError) return res.status(400).json({ success: false, message: domainError });

        let pending = await PendingSignup.findOne({ email: data.email });
        if (pending && Date.now() - pending.lastSentAt.getTime() < RESEND_SECONDS * 1000) {
            const wait = Math.ceil((RESEND_SECONDS * 1000 - (Date.now() - pending.lastSentAt.getTime())) / 1000);
            return res.status(429).json({ success: false, message: `A code was just sent. Wait ${wait} seconds before asking for another.`, retryAfter: wait });
        }
        if (!pending) pending = new PendingSignup({ email: data.email, codeHash: "x", payload: {}, expiresAt: new Date() });
        else pending.sends = (pending.sends || 0) + 1;
        if (pending.sends > MAX_SENDS) return res.status(429).json({ success: false, message: "Too many codes requested for this address. Try again in a few minutes." });
        pending.payload = { ...data, password: await bcrypt.hash(password, 10) };

        const sent = await issueCode(pending, data.name);
        if (!sent.ok) return res.status(sent.status).json({ success: false, message: sent.message });
        res.status(202).json({
            success: true, needsVerification: true, email: data.email, expiresInMinutes: CODE_MINUTES, resendAfter: RESEND_SECONDS,
            message: `We sent a 6-digit code to ${data.email}. Enter it to finish creating your account.`
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ success: false, message: "Registration failed. Please try again." });
    }
}

// Step 2: the right code proves the mailbox exists and belongs to this person; only now is the account created.
async function verifyRegistration(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const code = String(req.body.code || "").replace(/\s+/g, "");
        if (!email || !/^\d{6}$/.test(code)) return res.status(400).json({ success: false, message: "Enter the 6-digit code from the email." });

        const pending = await PendingSignup.findOne({ email });
        if (!pending || pending.expiresAt.getTime() < Date.now()) {
            return res.status(400).json({ success: false, expired: true, message: "This code has expired. Go back and request a new one." });
        }
        if (pending.attempts >= MAX_CODE_ATTEMPTS) {
            await pending.deleteOne();
            return res.status(429).json({ success: false, expired: true, message: "Too many wrong codes. Please start again." });
        }
        const given = Buffer.from(hashCode(email, code)), real = Buffer.from(pending.codeHash);
        if (given.length !== real.length || !crypto.timingSafeEqual(given, real)) {
            pending.attempts += 1;
            await pending.save();
            const left = MAX_CODE_ATTEMPTS - pending.attempts;
            return res.status(400).json({ success: false, message: left > 0 ? `That code is not correct. ${left} attempt${left > 1 ? "s" : ""} left.` : "Too many wrong codes. Please start again.", expired: left <= 0 });
        }

        if (await User.exists({ email })) { await pending.deleteOne(); return res.status(409).json({ success: false, message: "An account with this email already exists." }); }
        const user = await User.create(pending.payload);
        await pending.deleteOne();
        await startSession(req, user);
        const welcomeSent = await emails.sendWelcome(user);
        await notify(user._id, "Welcome to ScholarTrack", "Your account is ready. Browse scholarships and apply in a few minutes.", "success", "/scholarships.html");
        res.status(201).json({
            success: true, user: publicUser(user),
            message: welcomeSent ? `Email verified and account created! A welcome email is on its way to ${user.email}.` : "Email verified and account created!"
        });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ success: false, message: "An account with this email already exists." });
        console.error("Verification error:", error);
        res.status(error.name === "ValidationError" ? 400 : 500).json({ success: false, message: error.name === "ValidationError" ? error.message : "Could not verify the code." });
    }
}

// Sends a new code for a sign-up that is already waiting.
async function resendCode(req, res) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const pending = await PendingSignup.findOne({ email });
        if (!pending) return res.status(400).json({ success: false, expired: true, message: "This sign-up has expired. Please fill in the form again." });
        const wait = Math.ceil((RESEND_SECONDS * 1000 - (Date.now() - pending.lastSentAt.getTime())) / 1000);
        if (wait > 0) return res.status(429).json({ success: false, message: `Wait ${wait} seconds before asking for another code.`, retryAfter: wait });
        pending.sends = (pending.sends || 0) + 1;
        if (pending.sends > MAX_SENDS) return res.status(429).json({ success: false, message: "Too many codes requested. Try again in a few minutes." });
        const sent = await issueCode(pending, pending.payload.name);
        if (!sent.ok) return res.status(sent.status).json({ success: false, expired: true, message: sent.message });
        res.json({ success: true, resendAfter: RESEND_SECONDS, message: `A new code was sent to ${email}.` });
    } catch (error) {
        console.error("Resend code error:", error);
        res.status(500).json({ success: false, message: "Could not send a new code." });
    }
}

// Shared sign-in check. `portal` is decided by the ROUTE ("admin" or "student"), never by the browser.
// The admin portal only ever signs in administrators; the student portal only ever signs in students.
async function signIn(req, res, portal) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const password = String(req.body.password || "");
        if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });

        const user = await User.findOne({ email });
        const passwordOk = await bcrypt.compare(password.slice(0, 72), user ? user.password : DUMMY_HASH);
        const wrongPortal = user && (portal === "admin" ? user.role !== "admin" : user.role === "admin");
        if (!user || !passwordOk || wrongPortal) {
            // Same message for "no such user", "wrong password" and "not an administrator", so the portal
            // never reveals which accounts exist or what role they have. No session is created.
            const message = portal === "admin" ? "Invalid administrator email or password." : "Invalid email or password.";
            return res.status(401).json({ success: false, message });
        }
        if (user.active === false) return res.status(403).json({ success: false, message: "This account has been deactivated. Contact the administrator." });

        await startSession(req, user);
        res.json({ success: true, message: "Login successful!", user: publicUser(user) });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Login failed." });
    }
}

const login = (req, res) => signIn(req, res, "student");
const adminLogin = (req, res) => signIn(req, res, "admin");

// Never errors: returns the signed-in user, or null for visitors.
function session(req, res) {
    res.json({ success: true, user: req.user ? publicUser(req.user) : null });
}

function me(req, res) {
    res.json({ success: true, user: publicUser(req.user) });
}

function logout(req, res) {
    req.session.destroy(error => {
        if (error) return res.status(500).json({ success: false, message: "Logout failed." });
        res.clearCookie("scholartrack.sid");
        res.json({ success: true, message: "Logged out successfully." });
    });
}

// Password reset. When SMTP is configured the link is e-mailed; otherwise it is printed in the
// server console. The link is only returned to the browser when SHOW_RESET_LINK=true in a
// non-production environment (demo use), never by default.
// portal "admin": only administrator accounts get a link, and it opens the admin reset page.
async function requestReset(req, res, portal) {
    try {
        const email = String(req.body.email || "").trim().toLowerCase();
        const generic = { success: true, message: "If that email is registered, a password reset link has been sent." };
        const user = await User.findOne({ email });
        const allowed = user && user.active !== false && (portal === "admin" ? user.role === "admin" : user.role !== "admin");
        if (!allowed) return res.json(generic);

        const link = await createResetLink(user, req, portal === "admin" ? "admin-reset-password.html" : "reset-password.html");
        const emailSent = await emails.sendPasswordReset(user, link);
        if (!emailSent) console.log(`\n[ScholarTrack] Password reset email could not be delivered. Link for ${email} (valid 30 minutes):\n${link}\n`);

        const demo = process.env.SHOW_RESET_LINK === "true" && process.env.NODE_ENV !== "production";
        const response = emailSent ? generic : { ...generic, deliveryWarning: "Email delivery is not configured or failed. Check the server log or contact the administrator." };
        res.json(demo ? { ...response, devResetLink: link } : response);
    } catch (error) {
        console.error("Forgot password error:", error);
        res.status(500).json({ success: false, message: "Unable to process the request." });
    }
}

async function applyReset(req, res, portal) {
    try {
        const token = String(req.body.token || "");
        const password = String(req.body.password || "");
        const problem = passwordProblem(password);
        if (problem) return res.status(400).json({ success: false, message: problem });

        const hash = crypto.createHash("sha256").update(token).digest("hex");
        const user = await User.findOne({ resetTokenHash: hash, resetTokenExpires: { $gt: new Date() } });
        const roleOk = user && (portal === "admin" ? user.role === "admin" : user.role !== "admin");
        if (!roleOk) return res.status(400).json({ success: false, message: "This reset link is invalid or has expired." });

        user.password = await bcrypt.hash(password, 10);
        user.resetTokenHash = null;
        user.resetTokenExpires = null;
        await user.save();
        emails.sendPasswordChanged(user);
        res.json({ success: true, message: "Password updated. You can now sign in." });
    } catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ success: false, message: "Unable to reset the password." });
    }
}

const forgotPassword = (req, res) => requestReset(req, res, "student");
const resetPassword = (req, res) => applyReset(req, res, "student");
const adminForgotPassword = (req, res) => requestReset(req, res, "admin");
const adminResetPassword = (req, res) => applyReset(req, res, "admin");

module.exports = { register, verifyRegistration, resendCode, login, adminLogin, adminForgotPassword, adminResetPassword, me, session, logout, forgotPassword, resetPassword, passwordProblem, createResetLink, mailEnabled };
