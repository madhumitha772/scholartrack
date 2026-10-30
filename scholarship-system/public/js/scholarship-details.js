$(async function () {
    const user = await ST.publicNav("scholarships"); ST.publicFooter();
    const id = ST.query("id");
    if (!id) { $("#detailBody").html(`<div class="panel">${ST.empty("question-circle", "No scholarship selected", "Choose a scholarship from the list.", '<a class="btn btn-primary" href="/scholarships.html">Find scholarships</a>')}</div>`); return; }

    let s;
    try { s = await ST.get("/api/scholarships/" + id); }
    catch (e) { $("#detailBanner").remove(); $("#detailBody").html(`<div class="panel">${ST.empty("exclamation-circle", "Scholarship not found", e.message, '<a class="btn btn-primary" href="/scholarships.html">Back to scholarships</a>')}</div>`); return; }

    document.title = `${s.name} | ScholarTrack`;
    const open = ST.isOpen(s), left = ST.daysLeft(s.deadline);
    $("#detailBanner .container").html(`
        <a class="text-white-50 small d-inline-block mb-2" href="/scholarships.html"><i class="bi bi-arrow-left me-1"></i>All scholarships</a>
        <div class="d-flex flex-wrap gap-2 mb-2">${open ? '<span class="tag gold">Open for applications</span>' : '<span class="tag">Closed</span>'}${s.category !== "All" ? `<span class="tag teal">${ST.esc(s.category)}</span>` : ""}</div>
        <h1>${ST.esc(s.name)}</h1><p>${ST.esc(s.provider || "")}</p>`);

    const section = (icon, title, content) => content ? `<div class="mb-4"><h6 class="section-title"><i class="bi bi-${icon}"></i>${title}</h6>${content}</div>` : "";
    const docs = (s.requiredDocuments || []).length
        ? `<ul class="list-unstyled mb-0 row g-2">${s.requiredDocuments.map(d => `<li class="col-sm-6"><span class="d-flex align-items-center gap-2"><i class="bi bi-file-earmark-check text-primary"></i>${ST.esc(d)}</span></li>`).join("")}</ul>` : "";
    const crit = [];
    if (s.minCgpa > 0) crit.push(`Minimum CGPA ${s.minCgpa}`);
    if (s.incomeLimit > 0) crit.push(`Family income up to ${ST.inr(s.incomeLimit)} per year`);
    if (s.category !== "All") crit.push(`${s.category} category`);
    if (s.gender !== "All") crit.push(`${s.gender} students`);
    if (s.course !== "All") crit.push(`Course: ${s.course}`);
    if (s.state !== "All") crit.push(`Resident of ${s.state}`);
    const critHtml = crit.length ? `<div class="d-flex flex-wrap gap-2 mb-2">${crit.map(c => `<span class="tag teal">${ST.esc(c)}</span>`).join("")}</div>` : "";

    const contact = (s.contactEmail || s.contactPhone) ? `<div class="d-flex flex-wrap gap-4">${s.contactEmail ? `<a href="mailto:${ST.esc(s.contactEmail)}"><i class="bi bi-envelope me-1"></i>${ST.esc(s.contactEmail)}</a>` : ""}${s.contactPhone ? `<span><i class="bi bi-telephone me-1"></i>${ST.esc(s.contactPhone)}</span>` : ""}</div>` : "";

    // Right column: action card
    let action = "", check = "";
    if (!user) {
        action = `<a class="btn btn-primary btn-lg w-100 mb-2" href="/login.html?next=${encodeURIComponent("/apply.html?scholarship=" + s._id)}">Log in to apply</a>
                  <a class="btn btn-soft w-100" href="/register.html">Create an account</a>`;
    } else if (user.role === "admin") {
        action = `<a class="btn btn-ink w-100" href="/admin/scholarships.html">Manage scholarships</a>`;
    } else if (s.myApplication) {
        action = `<div class="mb-2">${ST.statusBadge(s.myApplication.status)}</div><p class="small text-muted">You applied on this scholarship (${ST.esc(s.myApplication.applicationNo)}).</p>
                  <a class="btn btn-primary w-100" href="/tracking.html?id=${s.myApplication._id}">Track application</a>`;
    } else if (!open) {
        action = `<button class="btn btn-secondary btn-lg w-100" disabled>Applications closed</button>`;
    } else {
        const c = s.eligibility_check || { eligible: true, reasons: [], missing: [] };
        action = `<a class="btn btn-primary btn-lg w-100 ${c.eligible ? "" : "disabled"}" href="/apply.html?scholarship=${s._id}" ${c.eligible ? "" : 'aria-disabled="true" tabindex="-1"'}>Apply now</a>`;
        if (c.eligible) {
            check = `<div class="mt-3 p-3 rounded" style="background:var(--leaf-soft)"><div class="fw-bold text-success mb-1"><i class="bi bi-check-circle-fill me-1"></i>You meet the listed criteria</div>
                ${c.missing.length ? `<div class="small">Add your ${ST.esc(c.missing.join(", "))} in your <a href="/profile.html">profile</a> to confirm the rest.</div>` : '<div class="small">Based on your profile. The final check happens when you apply.</div>'}</div>`;
        } else {
            check = `<div class="mt-3 p-3 rounded" style="background:var(--rose-soft)"><div class="fw-bold text-danger mb-1"><i class="bi bi-x-circle-fill me-1"></i>You may not be eligible</div>
                <ul class="small mb-2 ps-3">${c.reasons.map(r => `<li>${ST.esc(r)}</li>`).join("")}</ul><div class="small">If your profile is out of date, <a href="/profile.html">update it</a>.</div></div>`;
        }
    }

    $("#detailBody").html(`<div class="row g-4">
        <div class="col-lg-8"><div class="panel panel-pad">
            ${section("info-circle", "About this scholarship", `<p class="pre-line mb-0">${ST.esc(s.description || "No description provided.")}</p>`)}
            ${section("check2-square", "Eligibility", `${critHtml}<p class="pre-line mb-0">${ST.esc(s.eligibility || "")}</p>`)}
            ${section("files", "Documents you will need", docs)}
            ${section("trophy", "How applicants are selected", `<p class="pre-line mb-0">${ST.esc(s.selectionCriteria || "")}</p>`)}
            ${section("telephone", "Contact", contact)}
        </div></div>
        <div class="col-lg-4"><div class="panel panel-pad" style="position:sticky;top:90px">
            <div class="text-muted small">Scholarship amount</div><div class="display-font text-primary" style="font-size:2rem;font-weight:600">${ST.inr(s.amount)}</div>
            <div class="fact"><i class="bi bi-calendar-event"></i><div><div class="k">Application deadline</div><div class="v">${ST.date(s.deadline)}</div>
                <div class="small ${open ? (left <= 7 ? "text-warning" : "text-muted") : "text-danger"}">${open ? (left === 0 ? "Last day today" : left + " days left") : "Closed"}</div></div></div>
            <div class="fact"><i class="bi bi-people"></i><div><div class="k">Applications received</div><div class="v">${s.applicantCount || 0}</div></div></div>
            <div class="mt-3">${action}</div>${check}
        </div></div></div>`);
});
