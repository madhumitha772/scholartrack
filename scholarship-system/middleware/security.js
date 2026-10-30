// Security helpers written without extra dependencies:
// security headers, a small in-memory rate limiter, body defaults and request logging.

const IS_PROD = process.env.NODE_ENV === "production";

const CSP = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
].join("; ");

function securityHeaders(req, res, next) {
    res.setHeader("Content-Security-Policy", CSP);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    if (IS_PROD) res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    // API responses must never be cached (they contain personal data).
    if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
    next();
}

// Express 5 leaves req.body undefined when a request has no body; controllers expect an object.
function bodyDefaults(req, res, next) {
    if (req.body === undefined || req.body === null || typeof req.body !== "object") req.body = {};
    next();
}

// Fixed-window limiter. keyFn lets login attempts be counted per IP + email.
function rateLimit({ windowMs, max, message, keyFn }) {
    const hits = new Map();
    const timer = setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.reset <= now) hits.delete(key);
    }, Math.min(windowMs, 60000));
    timer.unref();

    return function limiter(req, res, next) {
        const now = Date.now();
        const key = keyFn ? keyFn(req) : req.ip;
        let entry = hits.get(key);
        if (!entry || entry.reset <= now) { entry = { count: 0, reset: now + windowMs }; hits.set(key, entry); }
        entry.count += 1;
        res.setHeader("RateLimit-Limit", String(max));
        res.setHeader("RateLimit-Remaining", String(Math.max(0, max - entry.count)));
        if (entry.count > max) {
            const wait = Math.ceil((entry.reset - now) / 1000);
            res.setHeader("Retry-After", String(wait));
            return res.status(429).json({ success: false, message: message || `Too many requests. Try again in ${Math.ceil(wait / 60)} minute(s).` });
        }
        next();
    };
}

function requestLogger(req, res, next) {
    if (req.path.startsWith("/css/") || req.path.startsWith("/js/")) return next();
    const start = process.hrtime.bigint();
    res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl.split("?")[0]} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    next();
}

module.exports = { securityHeaders, bodyDefaults, rateLimit, requestLogger, IS_PROD };
