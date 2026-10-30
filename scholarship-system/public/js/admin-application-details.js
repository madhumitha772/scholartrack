$(async function () {
    await ST.initApp({ role: "admin", active: "applications", title: "Application details", crumb: "Applications" });
    const id = ST.query("id");
    if (!id) { location.replace("/admin/applications.html"); return; }

    async function load() {
        let a;
        try { a = await ST.get("/api/applications/" + id); }
        catch (e) { $("#body").html(`<div class="panel">${ST.empty("exclamation-circle", "Application not found", e.message, '<a class="btn btn-primary" href="/admin/applications.html">Back to applications</a>')}</div>`); return; }
        // Older or partly filled records may lack some sections; fill them in so the page always draws.
        a.personal = a.personal || {}; a.academic = a.academic || {}; a.financial = a.financial || {}; a.other = a.other || {};
        a.history = Array.isArray(a.history) ? a.history : []; a.documents = Array.isArray(a.documents) ? a.documents : [];
        current = a;
        try { render(a); }
        catch (e) {
            console.error("Application details render failed:", e);
            $("#body").html(`<div class="panel">${ST.empty("exclamation-circle", "Could not display this application", "Something in the record could not be shown. Reload the page, or go back and try again.", '<a class="btn btn-primary" href="/admin/applications.html">Back to applications</a>')}</div>`);
        }
    }

    function render(a) {
        const st = a.student || {}, final = ["Approved", "Rejected"].includes(a.status);
        $("#body").html(`
        <div class="panel panel-pad mb-4"><div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div><div class="d-flex flex-wrap align-items-center gap-2 mb-1"><span class="tag">${ST.esc(a.applicationNo)}</span>${ST.statusBadge(a.status)}</div>
                <h2 class="h3 mb-1">${ST.esc(a.scholarship)}</h2><div class="text-muted">${ST.esc(a.personal.name || st.name)} · Applied ${ST.date(a.createdAt)} · ${ST.inr(a.amount)}</div></div>
            <div class="page-actions"><a class="btn btn-soft" href="/admin/applications.html"><i class="bi bi-arrow-left me-1"></i>Back</a>
                ${final ? "" : '<button class="btn btn-primary" data-act="Approved">Approve</button><button class="btn btn-outline-danger" data-act="Rejected">Reject</button>'}
                <button class="btn btn-ink" data-act=""><i class="bi bi-arrow-repeat me-1"></i>Change status</button></div></div></div>
        <div class="row g-4"><div class="col-lg-7">
            <div class="panel mb-4"><div class="panel-head"><h5>Application form</h5></div><div class="panel-body">${ST.appDetailHTML(a)}</div></div>
            <div class="panel"><div class="panel-head"><h5>Status history</h5></div><div class="panel-body py-2"><ul class="log">${[...a.history].reverse().map(h => `<li><span class="dot"></span><div><div class="fw-semibold">${ST.esc(h.status)} <span class="text-muted fw-normal small ms-1">${ST.dateTime(h.at)}</span></div><div class="text-muted small">${ST.esc(h.note)} · ${ST.esc(h.by)}</div></div></li>`).join("")}</ul></div></div>
        </div><div class="col-lg-5">
            <div class="panel mb-4"><div class="panel-head"><h5>Documents</h5><span class="tag">${a.documents.filter(d => d.verified).length}/${a.documents.length} verified</span></div><div class="panel-body" id="docs">${docs(a)}</div></div>
            <div class="panel mb-4"><div class="panel-head"><h5>Scholarship criteria</h5></div><div class="panel-body">${criteria(a)}</div></div>
            <div class="panel"><div class="panel-head"><h5>Student account</h5></div><div class="panel-body">
                <div class="d-flex align-items-center gap-3 mb-2"><span class="avatar">${ST.esc(ST.initials(st.name || a.personal.name))}</span><div><div class="cell-main">${ST.esc(st.name || a.personal.name || '')}</div><div class="cell-sub">${ST.esc(st.email || a.personal.email)}</div></div></div>
                <div class="small text-muted">Registered ${ST.date(st.createdAt)}${st.active === false ? ' · <span class="text-danger">Deactivated</span>' : ""}</div></div></div>
        </div></div>`);
    }

    function criteria(a) {
        const s = a.scholarshipDetails; if (!s) return '<div class="text-muted">The scholarship no longer exists.</div>';
        const ok = (pass) => pass ? '<i class="bi bi-check-circle-fill text-success"></i>' : '<i class="bi bi-x-circle-fill text-danger"></i>';
        const rows = [];
        if (s.minCgpa > 0) rows.push([a.academic.cgpa >= s.minCgpa, `CGPA ${a.academic.cgpa} (needs ${s.minCgpa}+)`]);
        if (s.incomeLimit > 0) rows.push([a.financial.familyIncome <= s.incomeLimit, `Income ${ST.inr(a.financial.familyIncome)} (limit ${ST.inr(s.incomeLimit)})`]);
        if (s.category !== "All") rows.push([a.other.category === s.category, `Category ${a.other.category} (needs ${s.category})`]);
        return rows.length ? `<div class="d-grid gap-2">${rows.map(([p, t]) => `<div class="d-flex gap-2 align-items-center">${ok(p)}<span>${ST.esc(t)}</span></div>`).join("")}</div>` : '<div class="text-muted">No numeric criteria set.</div>';
    }

    function docs(a) {
        if (!a.documents.length) return '<div class="text-muted">The student has not uploaded any documents.</div>';
        return `<div class="d-grid gap-2">${a.documents.map(d => `<div class="doc-slot has-file"><span class="d-icon"><i class="bi bi-${ST.docIcon(d.originalName)}"></i></span>
            <div class="flex-grow-1 overflow-hidden"><div class="d-name">${ST.esc(d.docType)} ${d.verified ? '<span class="tag teal ms-1"><i class="bi bi-patch-check-fill"></i>Verified</span>' : ""}</div>
            <div class="d-file">${ST.esc(d.originalName)} · ${ST.fileSize(d.size)}</div></div>
            <div class="btn-group"><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="/api/documents/${d._id}/file" title="Open"><i class="bi bi-eye"></i></a><a class="btn btn-soft btn-sm" href="/api/documents/${d._id}/file?download=1" title="Download"><i class="bi bi-download"></i></a>
            <button class="btn btn-sm ${d.verified ? "btn-soft" : "btn-primary"}" data-verify="${d._id}" data-v="${d.verified ? 0 : 1}">${d.verified ? "Unverify" : "Verify"}</button></div></div>`).join("")}</div>`;
    }

    let current;
    $("#body").on("click", "[data-act]", function () { ST.openStatusModal(current, $(this).data("act") || null, load); });
    $("#body").on("click", "[data-verify]", async function () {
        try { const r = await ST.put(`/api/documents/${$(this).data("verify")}/verify`, { verified: !!$(this).data("v") }); ST.toast(r.message, "success"); load(); } catch (e) { ST.fail(e); }
    });
    load();
});
