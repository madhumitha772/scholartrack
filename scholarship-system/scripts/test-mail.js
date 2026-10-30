// Usage: npm run test:mail you@example.com
// Checks the mail login, then sends a real test e-mail so you can confirm delivery works.
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { deliver, describe, mailEnabled, verifyConnection } = require("../utils/mailer");
const { templates } = require("../utils/emails");

(async () => {
    const to = process.argv[2];
    console.log(describe());
    if (!mailEnabled()) { console.error("E-mail is not configured. Set BREVO_API_KEY or SMTP_HOST in .env first."); process.exitCode = 1; return; }
    const check = await verifyConnection();
    Object.entries(check.results || {}).forEach(([name, x]) => console.log(`  ${name.toUpperCase()}: ${x.ok ? "ok" : "FAILED - " + (x.hint || x.error)}${x.note ? " (" + x.note + ")" : ""}`));
    if (!check.ok) { console.error(`\nConnection test FAILED: ${check.error || ""}\nHow to fix: ${check.hint}`); process.exitCode = 1; return; }
    console.log("Connection test passed.");
    if (!to) { console.log("Now run:  npm run test:mail you@example.com   to send a real test message."); return; }
    const result = await deliver({ to, ...templates.welcome({ name: "Test User", email: to }) });
    console.log(result.ok ? `Sent through ${String(result.via).toUpperCase()}! Check the inbox (and spam folder) of ${to}.` : `FAILED: ${result.hint || result.error}`);
    process.exitCode = result.ok ? 0 : 1;   // let Node exit by itself (process.exit() can crash on Windows with a libuv assertion)
})();
