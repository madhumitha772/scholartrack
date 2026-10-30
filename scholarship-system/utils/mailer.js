// E-mail delivery. Three modes, chosen automatically from the environment:
//   1. BREVO_API_KEY  -> Brevo HTTPS API (works on hosts that block SMTP ports, e.g. Render's free tier)
//   2. SMTP_HOST      -> any SMTP server through nodemailer (Gmail app password, Outlook, ...)
//   3. neither        -> nothing is sent; the message is printed to the server console
//
// When BOTH are configured, either one is used as a backup for the other: if the first fails, the
// message is retried through the second, so a wrong key on one side never blocks registration.
// Order: MAIL_PROVIDER=smtp|brevo wins; on Render/Railway/Fly Brevo goes first (SMTP is blocked there);
// everywhere else SMTP goes first (Gmail with an App Password is the most reliable on your own computer).
//
// Every failure is logged with a plain-English reason and a fix, and deliver() hands that reason
// back to the caller so the website can show an honest message instead of silently doing nothing.
const APP_NAME = "ScholarTrack";
const transporters = new Map();
let lastGoodSmtp = null;      // remembers which SMTP settings worked (587 or 465)
let lastError = null;

const isGmail = () => /(^|\.)(gmail|googlemail)\.com$/i.test(String(process.env.SMTP_HOST || "").trim());

const hasBrevo = () => Boolean(String(process.env.BREVO_API_KEY || "").trim());
const hasSmtp = () => Boolean(String(process.env.SMTP_HOST || "").trim());
const onBlockedSmtpHost = () => Boolean(process.env.RENDER || process.env.RAILWAY_ENVIRONMENT || process.env.FLY_APP_NAME || process.env.DYNO);

// Configured providers in the order they are tried.
function providers() {
    const list = [];
    if (hasBrevo()) list.push("brevo");
    if (hasSmtp()) list.push("smtp");
    const forced = String(process.env.MAIL_PROVIDER || "").trim().toLowerCase();
    if (forced && list.includes(forced)) return [forced, ...list.filter(p => p !== forced)];
    return onBlockedSmtpHost() ? list : list.reverse();
}

function provider() { return providers()[0] || null; }

// A provider that just failed because of its settings (bad key, blocked port) is skipped for a few
// minutes so every sign-up does not wait for it to time out again.
const COOLDOWN_MS = 10 * 60 * 1000;
const cooling = new Map();
const isCooling = (name) => (cooling.get(name) || 0) > Date.now();

// "ScholarTrack <me@example.com>" -> { name, email }
function parseFrom(value) {
    const raw = String(value || process.env.SMTP_USER || "").trim();
    const m = raw.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
    return m ? { name: m[1].trim() || APP_NAME, email: m[2].trim() } : { name: APP_NAME, email: raw };
}

function smtpUser() { return String(process.env.SMTP_USER || "").trim(); }
// Google shows app passwords as "abcd efgh ijkl mnop". Spaces are not part of the password.
function smtpPass() {
    const p = String(process.env.SMTP_PASS || "");
    return isGmail() ? p.replace(/\s+/g, "") : p.trim();
}

// Settings to try, in order. Gmail on port 587 falls back to port 465 because some networks block one of them.
function smtpConfigs() {
    const host = String(process.env.SMTP_HOST).trim();
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465;
    const list = [{ host, port, secure }];
    if (!process.env.SMTP_PORT || port === 587) list.push({ host, port: 465, secure: true });
    else if (port === 465) list.push({ host, port: 587, secure: false });
    if (lastGoodSmtp) list.sort((a, b) => (b.port === lastGoodSmtp.port) - (a.port === lastGoodSmtp.port));
    return list;
}

function getTransport(cfg) {
    const key = `${cfg.host}:${cfg.port}:${cfg.secure}:${smtpUser()}:${smtpPass()}`;
    if (!transporters.has(key)) {
        const nodemailer = require("nodemailer");
        transporters.set(key, nodemailer.createTransport({
            host: cfg.host, port: cfg.port, secure: cfg.secure,
            requireTLS: !cfg.secure,
            auth: smtpUser() ? { user: smtpUser(), pass: smtpPass() } : undefined,
            connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000
        }));
    }
    return transporters.get(key);
}

const CONNECTION_CODES = ["ETIMEDOUT", "ECONNECTION", "ESOCKET", "ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "EHOSTUNREACH", "EAI_AGAIN", "ENOTFOUND"];

// Turns a raw mail error into something a person can act on.
function explain(error) {
    const msg = String(error && error.message || error || "");
    const code = error && error.code;
    const resp = error && error.responseCode;
    if (code === "EAUTH" || resp === 535 || /Invalid login|Username and Password not accepted|BadCredentials/i.test(msg)) {
        return isGmail()
            ? "Gmail rejected the login. SMTP_PASS must be a 16-character Google App Password (Google Account > Security > 2-Step Verification > App passwords), not your normal Gmail password, and SMTP_USER must be that same Gmail address."
            : "The mail server rejected SMTP_USER / SMTP_PASS. Check the username and password.";
    }
    if (CONNECTION_CODES.includes(code) || /timed? ?out|ECONNREFUSED|getaddrinfo/i.test(msg)) {
        return "Could not reach the mail server. Your network, firewall or hosting provider is probably blocking SMTP. On Render/Railway use BREVO_API_KEY (HTTPS) instead of SMTP.";
    }
    if (/Application-specific password required|less secure/i.test(msg)) return "Gmail needs an App Password for SMTP (turn on 2-Step Verification, then create an App password).";
    if (/Brevo responded 401/i.test(msg)) return "Brevo rejected BREVO_API_KEY. Copy a fresh API key from Brevo > SMTP & API.";
    if (/Brevo responded 403/i.test(msg)) return "Brevo refused the request (403). Usual causes: the API key lacks the 'Transactional email' permission, Brevo > Security > Authorised IPs is switched on, or the Brevo account is not activated yet. Use the Gmail SMTP settings instead, or fix the Brevo account.";
    if (/Brevo responded 400/i.test(msg) && /sender/i.test(msg)) return "Brevo does not accept this sender. Verify the MAIL_FROM address in Brevo > Senders.";
    return msg.slice(0, 200) || "Unknown mail error.";
}

// True when the mail server itself says the recipient address does not exist.
function recipientRejected(error) {
    if (!error) return false;
    if (Array.isArray(error.rejected) && error.rejected.length) return true;
    const text = `${error.response || ""} ${error.message || ""}`;
    const resp = Number(error.responseCode) || 0;
    if (error.code === "EENVELOPE") return true;
    return [550, 551, 553].includes(resp) && /user unknown|no such user|does not exist|doesn't exist|mailbox (unavailable|not found)|unknown (user|recipient)|invalid (recipient|address)|5\.1\.[1-3]|recipient/i.test(text);
}

async function viaBrevo({ to, subject, text, html }) {
    const from = parseFrom(process.env.MAIL_FROM);
    if (!from.email) throw new Error("MAIL_FROM must be set to your verified Brevo sender address.");
    const res = await fetch(process.env.BREVO_API_URL || "https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": String(process.env.BREVO_API_KEY).trim(), "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ sender: from, to: [{ email: to }], subject, htmlContent: html || undefined, textContent: text }),
        signal: AbortSignal.timeout(15000)
    });
    if (!res.ok) throw new Error(`Brevo responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function viaSmtp({ to, subject, text, html }) {
    const configured = parseFrom(process.env.MAIL_FROM || process.env.SMTP_USER);
    // Gmail only sends as the logged-in account, so use that address to avoid silent rewriting/rejection.
    const fromEmail = isGmail() && smtpUser() ? smtpUser() : configured.email;
    const from = `"${configured.name.replace(/"/g, "")}" <${fromEmail}>`;
    let lastErr;
    for (const cfg of smtpConfigs()) {
        try {
            const info = await getTransport(cfg).sendMail({ from, to, subject, text, html });
            lastGoodSmtp = cfg;
            if (Array.isArray(info.rejected) && info.rejected.length) {
                const e = new Error(`Recipient rejected: ${info.rejected.join(", ")}`); e.rejected = info.rejected; throw e;
            }
            return;
        } catch (error) {
            lastErr = error;
            if (!CONNECTION_CODES.includes(error.code)) throw error;     // auth / recipient errors: do not retry
        }
    }
    throw lastErr;
}

// Never throws. Resolves to { ok, error, hint, rejected, via }.
async function deliver(message) {
    const order = providers();
    if (!order.length) return { ok: false, notConfigured: true, error: "Email is not configured.", hint: "Set SMTP_HOST/SMTP_USER/SMTP_PASS (or BREVO_API_KEY) in .env." };

    // Skip providers that are cooling down, unless that would leave nothing to try.
    let queue = order.filter(p => !isCooling(p));
    if (!queue.length) queue = order;

    let first = null;
    for (const name of queue) {
        try {
            await (name === "brevo" ? viaBrevo(message) : viaSmtp(message));
            cooling.delete(name); lastError = null;
            if (first) console.warn(`[mail] Sent through ${name.toUpperCase()} after ${first.name.toUpperCase()} failed. Fix the ${first.name.toUpperCase()} settings in .env or remove them.`);
            return { ok: true, via: name };
        } catch (error) {
            const hint = explain(error);
            console.error(`[mail] ${name.toUpperCase()} FAILED "${message.subject}" -> ${message.to}\n       reason: ${error.message}\n       fix:    ${hint}`);
            if (recipientRejected(error)) { lastError = hint; return { ok: false, error: error.message, hint, rejected: true, via: name }; }
            cooling.set(name, Date.now() + COOLDOWN_MS);
            if (!first) first = { name, error, hint };
        }
    }
    lastError = first.hint;
    return { ok: false, error: first.error.message, hint: first.hint, rejected: false };
}

// Resolves to true when the message was handed to the provider, false otherwise. Never throws.
async function sendMail(message) { return (await deliver(message)).ok; }

// Background-friendly variant: resolves to true/false and never throws.
function sendMailLater(message) {
    return new Promise(resolve => {
        setImmediate(async () => {
            const result = await deliver(message);
            if (result.notConfigured) console.log(`[mail] (not configured) To: ${message.to} | ${message.subject}`);
            resolve(result.ok);
        });
    });
}

// Checks every configured provider. A restricted Brevo key cannot read the account (403 there) but
// may still be allowed to send, so only a 401 counts as a bad key; real sending is the final test.
async function verifyOne(name) {
    if (name === "brevo") {
        try {
            const res = await fetch("https://api.brevo.com/v3/account", { headers: { "api-key": String(process.env.BREVO_API_KEY).trim(), accept: "application/json" }, signal: AbortSignal.timeout(10000) });
            if (res.status === 401) throw new Error("Brevo responded 401");
            if (res.status === 403) return { ok: true, note: "Brevo key accepted but restricted (cannot read the account). Sending is only proven by a real test email." };
            if (!res.ok) throw new Error(`Brevo responded ${res.status}`);
            return { ok: true };
        } catch (error) { return { ok: false, error: error.message, hint: explain(error) }; }
    }
    let lastErr;
    for (const cfg of smtpConfigs()) {
        try { await getTransport(cfg).verify(); lastGoodSmtp = cfg; return { ok: true, port: cfg.port }; }
        catch (error) { lastErr = error; if (!CONNECTION_CODES.includes(error.code)) break; }
    }
    return { ok: false, error: lastErr && lastErr.message, hint: explain(lastErr) };
}

async function verifyConnection() {
    const order = providers();
    if (!order.length) return { ok: false, notConfigured: true };
    const results = {};
    for (const name of order) results[name] = await verifyOne(name);
    const working = order.find(n => results[n].ok);
    if (working) return { ok: true, working, results };
    const first = results[order[0]];
    return { ok: false, error: first.error, hint: first.hint, results };
}

function describe() {
    const order = providers();
    if (!order.length) return "Email: NOT configured. Messages are only printed in this console (see README: Email setup).";
    const label = (n) => n === "brevo" ? `Brevo API (sender ${parseFrom(process.env.MAIL_FROM).email || "NOT SET"})` : `SMTP ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587} as ${smtpUser() || "(no user)"}`;
    return `Email: enabled through ${label(order[0])}` + (order[1] ? `; backup: ${label(order[1])}` : "");
}

module.exports = { sendMail, sendMailLater, deliver, verifyConnection, mailEnabled: () => providers().length > 0, describe, parseFrom, lastMailError: () => lastError };
