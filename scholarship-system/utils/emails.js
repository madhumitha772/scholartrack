// All e-mail templates in one place. Every template returns { subject, text, html }.
const { sendMailLater, deliver } = require("./mailer");

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const baseUrl = () => (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/+$/, "");

function layout({ preheader, title, bodyHtml, button, footnote }) {
    return `<!doctype html><html><body style="margin:0;padding:0;background:#F4F6F7;font-family:Segoe UI,Helvetica,Arial,sans-serif;color:#1E2B3A">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader || "")}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F7;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #E1E7EB;border-radius:14px;overflow:hidden">
<tr><td style="background:#10243E;padding:20px 28px"><span style="display:inline-block;background:#F5B335;color:#10243E;border-radius:8px;padding:4px 9px;font-weight:700;font-size:15px">&#127891;</span>
<span style="color:#ffffff;font-size:19px;font-weight:600;margin-left:8px;vertical-align:middle">ScholarTrack</span></td></tr>
<tr><td style="padding:28px 28px 8px"><h1 style="margin:0 0 14px;font-size:21px;line-height:1.3;color:#10243E">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.6;color:#1E2B3A">${bodyHtml}</div>
${button ? `<p style="margin:24px 0 8px"><a href="${esc(button.url)}" style="display:inline-block;background:#0F766E;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:8px">${esc(button.label)}</a></p>
<p style="margin:0 0 8px;font-size:12px;color:#5F6F80;word-break:break-all">Button not working? Copy this link into your browser:<br>${esc(button.url)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px 26px;font-size:12px;color:#5F6F80;border-top:1px solid #E1E7EB">${footnote ? esc(footnote) + "<br>" : ""}This is an automated message from ScholarTrack. Please do not reply.</td></tr>
</table></td></tr></table></body></html>`;
}

const T = {
    verifyEmail: (name, code, minutes) => ({
        subject: `${code} is your ScholarTrack verification code`,
        text: `Hello ${name},\n\nYour ScholarTrack verification code is: ${code}\n\nIt is valid for ${minutes} minutes. Enter it on the sign-up page to finish creating your account.\n\nIf you did not try to sign up, ignore this email and no account will be created.`,
        html: layout({
            preheader: `Your verification code is ${code}.`, title: "Confirm your email address",
            bodyHtml: `<p>Hello ${esc(name)},</p><p>Enter this code on the sign-up page to confirm that this email address is yours:</p>
<p style="margin:18px 0;text-align:center"><span style="display:inline-block;font-size:32px;letter-spacing:10px;font-weight:700;color:#10243E;background:#F4F6F7;border:1px dashed #C9D3DA;border-radius:10px;padding:12px 18px 12px 28px">${esc(code)}</span></p>
<p>The code is valid for <strong>${minutes} minutes</strong>.</p>`,
            footnote: "If you did not try to sign up, ignore this email. No account will be created."
        })
    }),
    welcome: (user) => ({
        subject: "Welcome to ScholarTrack: your account is ready",
        text: `Hello ${user.name},\n\nYour ScholarTrack account has been created with this email address (${user.email}).\n\nWhat to do next:\n1. Complete your profile so eligibility checks are accurate.\n2. Browse scholarships and apply.\n3. Track every stage of your application.\n\nOpen your dashboard: ${baseUrl()}/dashboard.html\n\nIf you did not create this account, please ignore this email or contact the administrator.`,
        html: layout({
            preheader: "Your account has been created successfully.", title: `Welcome, ${user.name}!`,
            bodyHtml: `<p>Your ScholarTrack account has been created successfully with <strong>${esc(user.email)}</strong>.</p>
<p style="margin-bottom:6px"><strong>What to do next</strong></p>
<ol style="margin:0 0 0 18px;padding:0"><li>Complete your profile so eligibility checks are accurate.</li><li>Browse scholarships and apply in a few minutes.</li><li>Track every stage of your application and get notified.</li></ol>`,
            button: { label: "Open my dashboard", url: `${baseUrl()}/dashboard.html` },
            footnote: "If you did not create this account, you can ignore this email."
        })
    }),
    reset: (user, link) => ({
        subject: "Reset your ScholarTrack password",
        text: `Hello ${user.name},\n\nWe received a request to reset your password. Use this link to choose a new one (valid for 30 minutes, works once):\n${link}\n\nIf you did not ask for this, ignore this email. Your password will not change.`,
        html: layout({
            preheader: "Use this link within 30 minutes to choose a new password.", title: "Reset your password",
            bodyHtml: `<p>Hello ${esc(user.name)},</p><p>We received a request to reset your ScholarTrack password. The link below is valid for <strong>30 minutes</strong> and can be used once.</p>`,
            button: { label: "Choose a new password", url: link },
            footnote: "If you did not request this, ignore this email. Your password will not change."
        })
    }),
    passwordChanged: (user) => ({
        subject: "Your ScholarTrack password was changed",
        text: `Hello ${user.name},\n\nThe password for your ScholarTrack account was just changed. If this was you, no action is needed.\n\nIf it was not you, reset your password immediately: ${baseUrl()}/forgot-password.html`,
        html: layout({
            preheader: "Your password was changed.", title: "Your password was changed",
            bodyHtml: `<p>Hello ${esc(user.name)},</p><p>The password for your account was just changed. If this was you, no action is needed.</p><p>If it was <strong>not</strong> you, reset your password right away.</p>`,
            button: { label: "Reset my password", url: `${baseUrl()}/forgot-password.html` }
        })
    }),
    applicationSubmitted: (user, app) => ({
        subject: `Application received: ${app.applicationNo}`,
        text: `Hello ${user.name},\n\nWe received your application ${app.applicationNo} for "${app.scholarship}".\n\nTrack its progress and upload any missing documents here: ${baseUrl()}/tracking.html?id=${app._id}`,
        html: layout({
            preheader: `Your application ${app.applicationNo} was received.`, title: "We received your application",
            bodyHtml: `<p>Hello ${esc(user.name)},</p><p>Your application <strong>${esc(app.applicationNo)}</strong> for <strong>${esc(app.scholarship)}</strong> was submitted successfully. You will be notified at every stage.</p>`,
            button: { label: "Track my application", url: `${baseUrl()}/tracking.html?id=${app._id}` }
        })
    }),
    statusChanged: (user, app, status, note) => {
        const lines = {
            "Under Review": "is now under review by the scholarship team.",
            "Documents Pending": "needs additional documents. Please check the remarks and upload them.",
            "Documents Verified": "has had all its documents verified.",
            "Approved": "has been approved. Congratulations!",
            "Rejected": "was not approved this time. Thank you for applying.",
            "Submitted": "was marked as submitted."
        };
        const line = lines[status] || `is now ${status}.`;
        return {
            subject: `${status}: ${app.scholarship} (${app.applicationNo})`,
            text: `Hello ${user.name},\n\nYour application ${app.applicationNo} for "${app.scholarship}" ${line}${note ? `\n\nNote from the scholarship office: ${note}` : ""}\n\nView details: ${baseUrl()}/tracking.html?id=${app._id}`,
            html: layout({
                preheader: `Your application is now: ${status}`, title: `Application update: ${status}`,
                bodyHtml: `<p>Hello ${esc(user.name)},</p><p>Your application <strong>${esc(app.applicationNo)}</strong> for <strong>${esc(app.scholarship)}</strong> ${esc(line)}</p>${note ? `<p style="background:#FEF4DC;border-radius:8px;padding:10px 14px;margin:14px 0"><strong>Note from the scholarship office:</strong><br>${esc(note)}</p>` : ""}`,
                button: { label: "View application", url: `${baseUrl()}/tracking.html?id=${app._id}` }
            })
        };
    }
};

// send(user, template...) helpers: fire-and-forget, never throw.
const send = (user, tpl) => user?.email ? sendMailLater({ to: user.email, ...tpl }) : Promise.resolve(false);

module.exports = {
    // Resolves to { ok, error, hint, rejected }: registration needs the real outcome, not just true/false.
    sendVerificationCode: (email, name, code, minutes) => deliver({ to: email, ...T.verifyEmail(name, code, minutes) }),
    sendWelcome: (user) => send(user, T.welcome(user)),
    sendPasswordReset: (user, link) => send(user, T.reset(user, link)),
    sendPasswordChanged: (user) => send(user, T.passwordChanged(user)),
    sendApplicationSubmitted: (user, app) => send(user, T.applicationSubmitted(user, app)),
    sendStatusChanged: (user, app, status, note) => send(user, T.statusChanged(user, app, status, note)),
    templates: T
};
