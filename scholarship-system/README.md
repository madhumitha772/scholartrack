# ScholarTrack: Scholarship Application and Tracking System

Full-stack college project: **HTML, CSS, Bootstrap 5, jQuery, Node.js, Express 5, MongoDB (Mongoose)**.

## Run it in VS Code

1. Open the `scholarship-system` folder in VS Code and open a terminal (Ctrl + `).
2. Run `npm install` once (the `node_modules` folder is not included in the zip).
3. Copy `.env.example` to `.env` and fill in your own `MONGO_URI`, `SESSION_SECRET`, and email-provider settings. The ZIP intentionally does not include `.env` because it can contain private credentials. `MONGO_URI` can be your Atlas string or a local MongoDB (`mongodb://127.0.0.1:27017/scholarship_db`).
4. Start: `npm start` (or `npm run dev` for auto-restart).
5. Open **http://localhost:5000**

The first start creates the admin account and 10 sample scholarships automatically.

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@scholartrack.com | Admin@123 |

Change these with `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` before the first run.

Optional demo data (7 students, 16 applications, so the charts and reports are filled):

```
npm run seed:demo      # demo student login: student@demo.com / Student@123
```

Bootstrap, jQuery, Chart.js and the icon font are bundled in `public/vendor`, so the app works offline. Only the Google Fonts (Fraunces, Figtree) need internet; without it the browser falls back to system fonts.

## Modules

| # | Module | Where |
|---|--------|-------|
| 1 | Registration, login, logout, role-based access, forgot/reset password | `login.html`, `register.html`, `forgot-password.html` |
| 2 | Student dashboard | `dashboard.html` |
| 3 | Student profile and change password | `profile.html` |
| 4 | Scholarship management (admin CRUD) | `admin/scholarships.html` |
| 5 | Search and filter (name, category, course, CGPA, income, gender, state, deadline; closed/expired listings can be viewed by leaving “Only open scholarships” unchecked) | `scholarships.html` |
| 6 | Scholarship details with eligibility check | `scholarship-details.html` |
| 7 | Application form (4-step wizard) | `apply.html` |
| 8 | Document upload, view, replace, verify | apply, tracking, `admin/documents.html` |
| 9 | Application tracking timeline | `tracking.html` |
| 10 | Application history | `my-applications.html` |
| 11 | Admin dashboard and application management | `admin/dashboard.html`, `admin/applications.html`, `admin/application-details.html`, `admin/students.html` |
| 12 | Notifications and reports (charts, CSV export) | `notifications.html`, `admin/reports.html` |

Statuses: Submitted, Under Review, Documents Pending, Documents Verified, Approved, Rejected. Every change is stored in the application history and sent to the student as a notification.

## Structure

```
server.js            Express app, sessions, route mounting
seed.js              npm run seed / seed:demo
models/              User, Scholarship, Application, Document, Notification
routes/              auth, profile, scholarships, applications, documents, notifications, admin
controllers/         business logic
middleware/          requireAuth, requireAdmin, requireStudent, optionalAuth
utils/               eligibility rules, notifications, seed data
public/              pages, css/style.css, js/*.js (jQuery)
uploads/             legacy folder only; documents are now stored in MongoDB and served only to the owner and admins
```

## Notes for the viva

- Passwords are hashed with bcrypt; sessions use `express-session` (httpOnly cookie).
- Admin pages are blocked on the server for non-admins; every API route checks the role.
- Eligibility (CGPA, income, category, gender, course, state, deadline) is enforced on the server, not only in the browser.
- Uploads accept PDF/JPG/PNG up to 5 MB and are only downloadable through an authenticated route.
- Password reset sends the link by email (see Email setup). If email is not configured or delivery fails, the server logs a warning and the reset link is printed in the server console (development use only).
- Sessions are stored in MongoDB (TTL index), so users stay signed in across server restarts. Set `SESSION_STORE=memory` only for tests.
- Application numbers come from an atomic counter, so two students applying at the same moment never get the same number.
- Uploads are checked by extension, size and file signature (real PDF/JPEG/PNG bytes).
- Rate limits on login, registration and password reset; cross-site request check on every state-changing API call; strict Content-Security-Policy (no inline scripts).
- CSV export neutralises spreadsheet formulas (`=`, `+`, `-`, `@`).
- If you used the older version of this project, delete its old `applications` documents (old field layout) from MongoDB.

## Email setup (welcome mail, password reset, application updates)

**Sign-up uses email verification.** After the form is filled in, the server e-mails a 6-digit code (valid 10 minutes, 5 tries). The account is created only when the correct code is entered, so an email address that does not exist, or that the person cannot open, can never become an account. Addresses on non-existent domains and addresses the mail server rejects are refused immediately with a clear message. Because of this, sign-up needs working email: run `npm run test:mail` first. With no email configured you can set `DEV_SHOW_CODE=true` (never in production) to print codes in the server console.

When the server starts it tests the mail login and prints either `Email: connection test passed` or the exact reason and fix (for example "use a Google App Password"). Every failed send is also logged with its reason.

The app sends these emails automatically: **welcome email** after the email is verified, **password reset link**, **password changed** alert, **application received**, and **status changed** (under review, approved, rejected, documents needed). **Verification code** at sign-up. Without email settings nothing is sent, and the reset link is only printed in the server terminal.

Pick ONE option and put the settings in `.env` (see `.env.example`).

### Option A: Brevo (free, 300 emails/day, works when deployed)
1. Create an account at brevo.com.
2. Go to **Senders, Domains & Dedicated IPs → Senders → Add a sender**. Use your own email address and click the verification link Brevo sends you.
3. Go to **SMTP & API → API Keys → Generate a new API key** and copy it.
4. In `.env` set:
   ```
   BREVO_API_KEY=xkeysib-your-key
   MAIL_FROM="ScholarTrack <the-address-you-verified@gmail.com>"
   APP_URL=http://localhost:5000
   ```

### Option B: Gmail SMTP (local use only; many hosts block SMTP)
1. In your Google account turn on **2-Step Verification**.
2. Open myaccount.google.com/apppasswords, create an app password and copy the 16 characters.
3. In `.env` set:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=the16characterapppassword
   MAIL_FROM="ScholarTrack <your.email@gmail.com>"
   ```

### Test it
```
npm install
npm run test:mail your.email@gmail.com
```
It prints `Sent!` on success. Then start the app, register with a real address and the welcome email arrives (check Spam the first time). On start the terminal shows `Email: enabled through ...`.

## Deploy online (Render + MongoDB Atlas, free)

1. **Atlas:** in Network Access add `0.0.0.0/0` (allow from anywhere), because Render's IP changes. Copy your connection string.
2. **GitHub:** create a repository and upload the project. `.gitignore` already keeps `.env` and `node_modules` out. Never upload `.env`.
3. **Render:** New → Web Service → connect the repository.
   - Build command: `npm install`  Start command: `npm start`
   - Instance type: Free
4. **Environment variables** (Render → Environment):

   | Key | Value |
   |-----|-------|
   | NODE_ENV | production |
   | TRUST_PROXY | 1 |
   | MONGO_URI | your Atlas string |
   | SESSION_SECRET | long random text (24+ characters) |
   | ADMIN_EMAIL / ADMIN_PASSWORD | your admin login (set a strong password) |
   | BREVO_API_KEY | from the Brevo step |
   | MAIL_FROM | `ScholarTrack <your verified sender>` |
   | APP_URL | your Render address, e.g. `https://scholartrack.onrender.com` |

5. Deploy. Open the Render URL; the health check is `/api/health`.

Good to know: uploaded documents are stored inside MongoDB, so they survive redeploys and restarts. Render's free plan sleeps after 15 minutes without visitors, so the first request afterwards takes about a minute. A `render.yaml` file is included if you prefer a Blueprint deploy.

## Production checklist

1. Set `NODE_ENV=production`, a long random `SESSION_SECRET` (24+ characters; the server refuses to start otherwise) and your Atlas `MONGO_URI`.
2. Put the app behind HTTPS and set `TRUST_PROXY=1` (Render, Railway, Nginx...). Cookies are marked `Secure` automatically in production.
3. Change `ADMIN_EMAIL` / `ADMIN_PASSWORD` before the first start, or change the password after logging in.
4. Configure email as described above (`BREVO_API_KEY` or `SMTP_*`, `MAIL_FROM`, `APP_URL`).
5. Health check: `GET /api/health`.
6. If Atlas cannot be reached because your network blocks DNS SRV lookups, the server retries with public DNS automatically (or set `USE_PUBLIC_DNS=true`).


## Scholarship catalogue

The app ships with 69 sample scholarships (engineering, science, commerce, management, medicine, category based, state based, women, sports and more). On every start-up the server adds any that are missing and extends sample deadlines that have passed, so search never comes back empty. Scholarships you add as admin are never changed. Set `AUTO_SEED=false` to switch this off. Search matches every word you type against the name, provider, description, eligibility, category, course and state.

## Email: if you set both Brevo and Gmail (SMTP)
The app tries every configured provider and falls back to the next one if one fails
(e.g. Brevo answers 403). On your own computer SMTP (Gmail) is tried first; on Render
Brevo is tried first. Force the order with `MAIL_PROVIDER=smtp` or `MAIL_PROVIDER=brevo`.
Test with: `npm run test:mail youraddress@gmail.com`
