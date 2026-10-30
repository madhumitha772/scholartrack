/* ScholarTrack shared helpers (jQuery). Loaded on every page. */
window.ST = (function ($) {
    "use strict";
    const ST = { user: null };

    /* ---------- formatting ---------- */
    ST.esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    ST.inr = (v) => "₹" + Number(v || 0).toLocaleString("en-IN");
    ST.date = (v) => {
        if (!v) return "Not specified";
        const d = new Date(v); if (isNaN(d)) return String(v);
        return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    };
    ST.dateTime = (v) => {
        if (!v) return ""; const d = new Date(v); if (isNaN(d)) return "";
        return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    };
    ST.inputDate = (v) => { if (!v) return ""; const d = new Date(v); return isNaN(d) ? "" : d.toISOString().slice(0, 10); };
    ST.timeAgo = (v) => {
        const s = Math.floor((Date.now() - new Date(v).getTime()) / 1000);
        if (s < 60) return "Just now"; if (s < 3600) return Math.floor(s / 60) + " min ago";
        if (s < 86400) return Math.floor(s / 3600) + " hr ago"; if (s < 604800) return Math.floor(s / 86400) + " days ago";
        return ST.date(v);
    };
    ST.daysLeft = (v) => { if (!v) return null; const d = new Date(v); d.setHours(23, 59, 59, 999); return Math.ceil((d - Date.now()) / 86400000); };
    ST.initials = (n) => String(n || "U").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("").toUpperCase();
    ST.fileSize = (b) => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
    ST.query = (key) => new URLSearchParams(location.search).get(key);

    /* ---------- statuses ---------- */
    ST.STATUSES = ["Submitted", "Under Review", "Documents Pending", "Documents Verified", "Approved", "Rejected"];
    const STATUS_CLASS = { "Submitted": "st-submitted", "Under Review": "st-review", "Documents Pending": "st-pending", "Documents Verified": "st-verified", "Approved": "st-approved", "Rejected": "st-rejected" };
    ST.statusBadge = (s) => `<span class="status ${STATUS_CLASS[s] || "st-submitted"}">${ST.esc(s)}</span>`;

    /* ---------- toast ---------- */
    ST.toast = function (message, type = "info") {
        let stack = $(".toast-stack");
        if (!stack.length) stack = $('<div class="toast-stack" aria-live="polite"></div>').appendTo("body");
        const icon = { success: "check-circle-fill", error: "x-octagon-fill", warning: "exclamation-triangle-fill", info: "info-circle-fill" }[type] || "info-circle-fill";
        const el = $(`<div class="st-toast ${type}" role="status"><i class="bi bi-${icon}"></i><div>${ST.esc(message)}</div></div>`).appendTo(stack);
        setTimeout(() => el.fadeOut(250, () => el.remove()), 3800);
    };

    /* ---------- api ---------- */
    ST.api = function (method, url, data) {
        const opts = { method, url, dataType: "json", xhrFields: { withCredentials: true } };
        if (data !== undefined && method !== "GET") { opts.data = JSON.stringify(data); opts.contentType = "application/json"; }
        else if (data) opts.data = data;
        return new Promise((resolve, reject) => {
            $.ajax(opts).done(resolve).fail(xhr => {
                const body = xhr.responseJSON || {};
                if (xhr.status === 401 && !url.startsWith("/api/auth/")) {
                    location.href = (location.pathname.startsWith("/admin") ? "/admin-login.html" : "/login.html") + "?next=" + encodeURIComponent(location.pathname + location.search);
                    return;
                }
                const err = new Error(body.message || (xhr.status === 0 ? "Cannot reach the server. Is it running?" : "Something went wrong."));
                err.status = xhr.status; err.body = body; reject(err);
            });
        });
    };
    ST.get = (u, d) => ST.api("GET", u, d);
    ST.post = (u, d) => ST.api("POST", u, d || {});
    ST.put = (u, d) => ST.api("PUT", u, d || {});
    ST.del = (u) => ST.api("DELETE", u);
    ST.fail = (e) => ST.toast(e.message || "Something went wrong.", "error");

    ST.upload = function (url, formData) {
        return new Promise((resolve, reject) => {
            $.ajax({ method: "POST", url, data: formData, processData: false, contentType: false, dataType: "json", xhrFields: { withCredentials: true } })
                .done(resolve).fail(xhr => reject(new Error((xhr.responseJSON || {}).message || "Upload failed.")));
        });
    };

    /* ---------- buttons ---------- */
    ST.busy = function ($btn, on, label) {
        if (on) { $btn.data("html", $btn.html()).prop("disabled", true).html(`<span class="spinner-border spinner-border-sm me-2"></span>${ST.esc(label || "Please wait")}`); }
        else { $btn.prop("disabled", false).html($btn.data("html") || $btn.html()); }
    };

    /* ---------- ui blocks ---------- */
    ST.loading = (text = "Loading") => `<div class="page-loading"><div class="spinner-border spinner-border-sm text-primary"></div>${ST.esc(text)}…</div>`;
    ST.empty = (icon, title, text, action = "") => `<div class="empty"><i class="bi bi-${icon}"></i><h6>${ST.esc(title)}</h6><p class="mb-${action ? 3 : 0}">${ST.esc(text)}</p>${action}</div>`;

    ST.confirm = function (title, text, okLabel = "Confirm", danger = false) {
        return new Promise(resolve => {
            $("#stConfirm").remove();
            const el = $(`<div class="modal fade" id="stConfirm" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <div class="modal-header"><h5 class="modal-title">${ST.esc(title)}</h5><button class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                <div class="modal-body">${ST.esc(text)}</div>
                <div class="modal-footer"><button class="btn btn-soft" data-bs-dismiss="modal">Cancel</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="stConfirmOk">${ST.esc(okLabel)}</button></div>
            </div></div></div>`).appendTo("body");
            const modal = new bootstrap.Modal(el[0]); let result = false;
            el.find("#stConfirmOk").on("click", () => { result = true; modal.hide(); });
            el.on("hidden.bs.modal", () => { el.remove(); resolve(result); });
            modal.show();
        });
    };

    /* ---------- tracker ---------- */
    ST.trackerHTML = function (app) {
        const status = app.status, hist = app.history || [];
        const at = (...names) => { const h = [...hist].reverse().find(x => names.includes(x.status)); return h ? ST.date(h.at) : ""; };
        const cur = { "Submitted": 0, "Under Review": 1, "Documents Pending": 1, "Documents Verified": 2, "Approved": 3, "Rejected": 3 }[status] ?? 0;
        const stages = [
            { icon: "send-check", title: "Application submitted", sub: "We received your application.", when: at("Submitted") },
            { icon: "search", title: "Under review", sub: "The scholarship team is reading your application.", when: at("Under Review") },
            { icon: "patch-check", title: "Documents verified", sub: "Your uploaded documents have been checked.", when: at("Documents Verified") },
            { icon: "award", title: "Final decision", sub: "The decision is announced here and by notification.", when: at("Approved", "Rejected") }
        ];
        return `<ol class="tracker">${stages.map((s, i) => {
            let cls = "", icon = s.icon, title = s.title, sub = s.sub;
            if (i < cur) { cls = "done"; icon = "check-lg"; }
            else if (i === cur) {
                if (status === "Approved") { cls = "done approved"; icon = "trophy"; title = "Approved"; sub = "Congratulations! Your scholarship has been approved."; }
                else if (status === "Rejected") { cls = "done rejected"; icon = "x-lg"; title = "Not approved"; sub = "Your application was not selected this time."; }
                else if (status === "Documents Pending") { cls = "attention"; icon = "exclamation-lg"; title = "Documents needed"; sub = app.remarks || "Please upload the requested documents."; }
                else if (status === "Documents Verified" || status === "Submitted" || status === "Under Review") { cls = "current"; }
            }
            if (i === cur && (status === "Documents Verified") ) { /* waiting for final decision */ }
            return `<li class="${cls}"><span class="node"><i class="bi bi-${icon}"></i></span><div class="t-title">${ST.esc(title)}</div><div class="t-sub">${ST.esc(sub)}${s.when && i <= cur ? ` <span class="d-block">${ST.esc(s.when)}</span>` : ""}</div></li>`;
        }).join("")}</ol>`;
    };

    /* ---------- scholarship card ---------- */
    ST.deadlineHTML = function (s) {
        const left = ST.daysLeft(s.deadline);
        if (s.status === "Closed" || left < 0) return `<span class="deadline over"><i class="bi bi-lock"></i>Closed</span>`;
        if (left === 0) return `<span class="deadline soon"><i class="bi bi-alarm"></i>Last day today</span>`;
        if (left <= 7) return `<span class="deadline soon"><i class="bi bi-alarm"></i>${left} day${left > 1 ? "s" : ""} left</span>`;
        return `<span class="deadline"><i class="bi bi-calendar-event"></i>${ST.date(s.deadline)}</span>`;
    };
    ST.isOpen = (s) => s.status !== "Closed" && ST.daysLeft(s.deadline) >= 0;

    ST.scholarshipCard = function (s) {
        const tags = [];
        if (s.minCgpa > 0) tags.push(`<span class="tag"><i class="bi bi-mortarboard"></i>CGPA ${s.minCgpa}+</span>`);
        if (s.incomeLimit > 0) tags.push(`<span class="tag"><i class="bi bi-wallet2"></i>Income ≤ ${ST.inr(s.incomeLimit)}</span>`);
        if (s.category && s.category !== "All") tags.push(`<span class="tag teal">${ST.esc(s.category)}</span>`);
        if (s.gender && s.gender !== "All") tags.push(`<span class="tag teal">${ST.esc(s.gender)} only</span>`);
        if (s.course && s.course !== "All") tags.push(`<span class="tag">${ST.esc(s.course)}</span>`);
        if (s.state && s.state !== "All") tags.push(`<span class="tag"><i class="bi bi-geo-alt"></i>${ST.esc(s.state)}</span>`);
        const open = ST.isOpen(s);
        return `<div class="col-md-6 col-xl-4"><article class="sch-card">
            <div class="provider">${ST.esc(s.provider || "Scholarship provider")}</div>
            <h5><a href="/scholarship-details.html?id=${s._id}" class="text-reset stretched-link">${ST.esc(s.name)}</a></h5>
            <div class="amount">${ST.inr(s.amount)}</div>
            <p class="desc">${ST.esc(s.description || s.eligibility || "")}</p>
            <div class="meta">${tags.join("") || '<span class="tag">Open to all</span>'}</div>
            <div class="foot">${ST.deadlineHTML(s)}
                <span class="position-relative" style="z-index:2">${open
                    ? `<a class="btn btn-primary btn-sm" href="/apply.html?scholarship=${s._id}">Apply now</a>`
                    : `<a class="btn btn-soft btn-sm" href="/scholarship-details.html?id=${s._id}">View details</a>`}</span></div>
        </article></div>`;
    };

    /* ---------- layout ---------- */
    const STUDENT_NAV = [
        ["dashboard", "/dashboard.html", "speedometer2", "Dashboard"],
        ["scholarships", "/scholarships.html", "search", "Find scholarships"],
        ["applications", "/my-applications.html", "folder2-open", "My applications"],
        ["notifications", "/notifications.html", "bell", "Notifications"],
        ["profile", "/profile.html", "person-circle", "My profile"]
    ];
    const ADMIN_NAV = [
        ["dashboard", "/admin/dashboard.html", "speedometer2", "Dashboard"],
        ["applications", "/admin/applications.html", "inboxes", "Applications"],
        ["scholarships", "/admin/scholarships.html", "award", "Scholarships"],
        ["students", "/admin/students.html", "people", "Students"],
        ["documents", "/admin/documents.html", "file-earmark-check", "Documents"],
        ["reports", "/admin/reports.html", "bar-chart-line", "Reports"]
    ];

    function buildShell(opts) {
        const nav = opts.role === "admin" ? ADMIN_NAV : STUDENT_NAV;
        const u = ST.user;
        const links = nav.map(([key, href, icon, label]) =>
            `<a class="side-link ${opts.active === key ? "active" : ""}" href="${href}"><i class="bi bi-${icon}"></i><span>${label}</span>${key === "notifications" ? '<span class="badge-dot d-none" id="navUnread"></span>' : ""}</a>`).join("");
        $("#sidebar").html(`
            <a class="brand" href="${opts.role === "admin" ? "/admin/dashboard.html" : "/"}"><span class="brand-mark"><i class="bi bi-mortarboard-fill"></i></span>
                <span><span class="brand-name">ScholarTrack</span><span class="brand-sub">${opts.role === "admin" ? "Administration" : "Student portal"}</span></span></a>
            <div class="side-label">${opts.role === "admin" ? "Manage" : "Menu"}</div>${links}
            <div class="side-label">Account</div>
            <a class="side-link" href="/"><i class="bi bi-house"></i><span>Home page</span></a>
            <a class="side-link" href="#" id="logoutLink"><i class="bi bi-box-arrow-right"></i><span>Log out</span></a>
            <div class="side-foot"><div class="side-user"><span class="avatar">${ST.esc(ST.initials(u.name))}</span>
                <div class="overflow-hidden"><div class="u-name">${ST.esc(u.name)}</div><div class="u-role">${opts.role === "admin" ? "Administrator" : "Student"}</div></div></div></div>`);
        $("#topbar").html(`
            <button class="icon-btn menu-btn" id="menuBtn" aria-label="Open menu"><i class="bi bi-list fs-5"></i></button>
            <div class="me-auto"><div class="crumb">${ST.esc(opts.crumb || (opts.role === "admin" ? "Administration" : "Student portal"))}</div><h1>${ST.esc(opts.title || "")}</h1></div>
            ${opts.role === "student" ? `<a class="icon-btn" href="/notifications.html" aria-label="Notifications"><i class="bi bi-bell"></i><span class="count d-none" id="bellCount"></span></a>` : ""}
            ${opts.topAction || ""}`);
        $("#menuBtn").on("click", () => $("#sidebar").toggleClass("open"));
        $(document).on("click", e => { if ($("#sidebar").hasClass("open") && !$(e.target).closest("#sidebar, #menuBtn").length) $("#sidebar").removeClass("open"); });
        $("#logoutLink").on("click", e => { e.preventDefault(); ST.logout(); });
        if (opts.role === "student") { ST.refreshUnread(); setInterval(ST.refreshUnread, 60000); }
    }

    ST.refreshUnread = function () {
        $.getJSON("/api/notifications/unread-count").done(d => {
            const n = d.unread || 0;
            $("#bellCount").text(n > 9 ? "9+" : n).toggleClass("d-none", !n);
            $("#navUnread").text(n).toggleClass("d-none", !n);
        });
    };

    ST.logout = async function () {
        try { await ST.post("/api/auth/logout"); } catch (_) { /* ignore */ }
        location.href = (ST.user && ST.user.role === "admin") ? "/admin-login.html" : "/login.html";
    };

    // /api/auth/session answers 200 with user:null when signed out, so public pages log no console errors.
    ST.me = () => new Promise(resolve => $.getJSON("/api/auth/session").done(d => { ST.user = d.user || null; resolve(ST.user); }).fail(() => resolve(null)));

    // Buttons marked data-print open the browser's print dialog (inline onclick is blocked by the CSP).
    $(document).on("click", "[data-print]", () => window.print());

    // Protected pages: checks the session, redirects when needed, builds the shell.
    ST.initApp = async function (opts) {
        const user = await ST.me();
        const next = encodeURIComponent(location.pathname + location.search);
        if (!user) { location.replace((opts.role === "admin" ? "/admin-login.html" : "/login.html") + "?next=" + next); return new Promise(() => {}); }
        if (opts.role && user.role !== opts.role) { location.replace(user.role === "admin" ? "/admin/dashboard.html" : "/dashboard.html"); return new Promise(() => {}); }
        buildShell(opts);
        document.title = `${opts.title} | ScholarTrack`;
        $("body").removeClass("is-loading");
        try { const flash = sessionStorage.getItem("st_flash"); if (flash) { sessionStorage.removeItem("st_flash"); ST.toast(flash, "success"); } } catch (_) { /* storage blocked */ }
        return user;
    };

    /* ---------- public nav / footer ---------- */
    ST.publicNav = async function (active) {
        const user = await ST.me();
        const link = (key, href, label) => `<li class="nav-item"><a class="nav-link ${active === key ? "active" : ""}" href="${href}">${label}</a></li>`;
        const home = user ? (user.role === "admin" ? "/admin/dashboard.html" : "/dashboard.html") : null;
        $("#publicNav").html(`<nav class="navbar navbar-expand-lg py-2"><div class="container">
            <a class="brand navbar-brand m-0" href="/"><span class="brand-mark"><i class="bi bi-mortarboard-fill"></i></span><span class="brand-name">ScholarTrack</span></a>
            <button class="navbar-toggler border-0" data-bs-toggle="collapse" data-bs-target="#pubMenu" aria-label="Menu"><i class="bi bi-list fs-3"></i></button>
            <div class="collapse navbar-collapse" id="pubMenu">
                <ul class="navbar-nav mx-lg-auto gap-lg-1">${link("home", "/", "Home")}${link("scholarships", "/scholarships.html", "Scholarships")}${link("how", "/#how", "How it works")}</ul>
                <div class="d-flex gap-2 mt-3 mt-lg-0">${user
                    ? `<a class="btn btn-primary" href="${home}"><i class="bi bi-speedometer2 me-1"></i>Go to dashboard</a>`
                    : `<a class="btn btn-soft" href="/login.html">Log in</a><a class="btn btn-primary" href="/register.html">Create account</a>`}</div>
            </div></div></nav>`);
        return user;
    };

    ST.publicFooter = function () {
        $("#publicFooter").html(`<div class="container"><div class="row g-4 pb-4">
            <div class="col-lg-5"><a class="brand mb-3" href="/"><span class="brand-mark"><i class="bi bi-mortarboard-fill"></i></span><span class="brand-name">ScholarTrack</span></a>
                <p class="mb-0" style="max-width:40ch">One place to find scholarships, apply with your documents, and follow every application until the decision.</p></div>
            <div class="col-6 col-lg-3"><h6 class="text-white mb-3">Students</h6><div class="d-grid gap-2"><a href="/scholarships.html">Find scholarships</a><a href="/register.html">Create an account</a><a href="/login.html">Log in</a></div></div>
            <div class="col-6 col-lg-4"><h6 class="text-white mb-3">Administrators</h6><div class="d-grid gap-2"><a href="/admin-login.html">Administrator login</a><a href="/#how">How the process works</a></div></div></div>
            <div class="border-top pt-3 small" style="border-color:rgba(255,255,255,.12)!important">© ${new Date().getFullYear()} ScholarTrack. Scholarship Application and Tracking System.</div></div>`);
    };

    /* ---------- misc ---------- */
    ST.togglePassword = function () {
        $(document).on("click", ".pw-toggle", function () {
            const input = $(this).siblings("input"); const show = input.attr("type") === "password";
            input.attr("type", show ? "text" : "password"); $(this).find("i").attr("class", show ? "bi bi-eye-slash" : "bi bi-eye"); $(this).attr("aria-label", show ? "Hide password" : "Show password");
        });
    };
    ST.safeNext = (fallback) => { const n = ST.query("next"); return n && n.startsWith("/") && !n.startsWith("//") ? n : fallback; };
    ST.fillSelect = ($sel, values, firstLabel) => {
        $sel.html(`<option value="">${ST.esc(firstLabel)}</option>` + values.map(v => `<option>${ST.esc(v)}</option>`).join(""));
    };
    ST.debounce = (fn, ms = 300) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

    return ST;
})(jQuery);

/* Shared option lists */
ST.STATES = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
ST.COURSES = ["B.Tech", "B.E", "B.Sc", "B.Sc Computer Science", "B.Com", "B.A", "BBA", "BCA", "B.Pharm", "MBBS", "M.Tech", "M.Sc", "M.Com", "MBA", "MCA", "Diploma"];
ST.CATEGORIES = ["General", "OBC", "SC", "ST", "EWS", "Minority"];
ST.fillCommon = function () {
    $("select[data-fill=state]").each(function () { ST.fillSelect($(this), ST.STATES, $(this).data("placeholder") || "Select state"); });
    $("select[data-fill=category]").each(function () { ST.fillSelect($(this), ST.CATEGORIES, $(this).data("placeholder") || "Select category"); });
    $("datalist#courseList").html(ST.COURSES.map(c => `<option value="${ST.esc(c)}">`).join(""));
};

/* Shared renderers for application data */
ST.kv = (label, value) => `<div class="col-sm-6"><div class="small text-muted">${ST.esc(label)}</div><div class="fw-semibold">${value === null || value === undefined || value === "" ? '<span class="text-muted fw-normal">Not provided</span>' : ST.esc(value)}</div></div>`;
ST.appDetailHTML = function (a) {
    const p = a.personal || {}, ac = a.academic || {}, f = a.financial || {}, o = a.other || {};
    const block = (icon, title, rows) => `<h6 class="section-title"><i class="bi bi-${icon}"></i>${title}</h6><div class="row g-3 mb-4">${rows}</div>`;
    return block("person", "Personal information", ST.kv("Name", p.name) + ST.kv("Email", p.email) + ST.kv("Phone", p.phone) + ST.kv("Date of birth", p.dob ? ST.date(p.dob) : "") + `<div class="col-12"><div class="small text-muted">Address</div><div class="fw-semibold">${ST.esc(p.address) || '<span class="text-muted fw-normal">Not provided</span>'}</div></div>`)
        + block("mortarboard", "Academic information", ST.kv("College", ac.college) + ST.kv("Course", ac.course) + ST.kv("Department", ac.department) + ST.kv("Year", ac.year) + ST.kv("CGPA", ac.cgpa) + ST.kv("Previous semester marks", ac.previousMarks != null ? ac.previousMarks + "%" : ""))
        + block("wallet2", "Financial information", ST.kv("Annual family income", ST.inr(f.familyIncome)) + ST.kv("Parent / guardian occupation", f.guardianOccupation))
        + block("stars", "Other information", ST.kv("Category", o.category) + `<div class="col-12"><div class="small text-muted">Achievements</div><div class="fw-semibold pre-line">${ST.esc(o.achievements) || '<span class="text-muted fw-normal">None listed</span>'}</div></div><div class="col-12"><div class="small text-muted">Extracurricular activities</div><div class="fw-semibold pre-line">${ST.esc(o.extracurricular) || '<span class="text-muted fw-normal">None listed</span>'}</div></div>`);
};
ST.docIcon = (name) => /\.pdf$/i.test(name) ? "filetype-pdf" : "file-earmark-image";

/* Admin: shared "update status" modal (markup lives in the page) */
ST.openStatusModal = function (app, preset, onSaved) {
    const $sel = $("#newStatus");
    $sel.html(ST.STATUSES.map(s => `<option>${s}</option>`).join(""));
    $sel.val(preset || app.status); $("#remarks").val("");
    $("#statusFor").html(`<strong>${ST.esc(app.applicationNo)}</strong> · ${ST.esc(app.personal?.name || "")} · ${ST.esc(app.scholarship)}<br>Current status: ${ST.statusBadge(app.status)}`);
    const modal = bootstrap.Modal.getOrCreateInstance("#statusModal"); modal.show();
    $("#statusForm").off("submit").on("submit", async function (e) {
        e.preventDefault();
        const $btn = $("#statusSave"); ST.busy($btn, true, "Saving");
        try {
            const r = await ST.put(`/api/applications/${app._id}/status`, { status: $sel.val(), remarks: $("#remarks").val() });
            ST.toast(r.message, "success"); modal.hide(); onSaved && onSaved(r.application);
        } catch (err) { ST.fail(err); }
        ST.busy($btn, false);
    });
};
