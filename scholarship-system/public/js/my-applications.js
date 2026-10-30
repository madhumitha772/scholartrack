$(async function () {
    await ST.initApp({ role: "student", active: "applications", title: "My applications" });
    ST.STATUSES.forEach(s => $("#fStatus").append(`<option>${s}</option>`));
    let all = [];

    const render = () => {
        const q = $("#q").val().trim().toLowerCase(), st = $("#fStatus").val();
        const rows = all.filter(a => (st === "All" || a.status === st) && (!q || (a.scholarship + " " + a.applicationNo).toLowerCase().includes(q)));
        $("#list").html(rows.length ? `<table class="table table-hover"><thead><tr><th>Application</th><th>Applied on</th><th>Amount</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>${rows.map(a => `
            <tr><td><div class="cell-main">${ST.esc(a.scholarship)}</div><div class="cell-sub">${ST.esc(a.applicationNo)}</div></td><td>${ST.date(a.createdAt)}</td><td>${ST.inr(a.amount)}</td><td>${ST.statusBadge(a.status)}</td>
            <td class="text-end text-nowrap"><button class="btn btn-soft btn-sm" data-view="${a._id}">View</button> <a class="btn btn-primary btn-sm" href="/tracking.html?id=${a._id}">Track</a>
            ${["Approved", "Rejected"].includes(a.status) ? "" : `<button class="btn btn-soft btn-sm text-danger" data-withdraw="${a._id}" title="Withdraw application"><i class="bi bi-trash"></i></button>`}</td></tr>`).join("")}</tbody></table>`
            : ST.empty("folder2-open", all.length ? "No applications match" : "You have not applied yet", all.length ? "Try a different search or status." : "Find a scholarship that fits and apply in a few minutes.", all.length ? "" : '<a class="btn btn-primary" href="/scholarships.html">Find scholarships</a>'));
    };

    async function load() { try { all = await ST.get("/api/applications"); render(); } catch (e) { ST.fail(e); $("#list").html(ST.empty("wifi-off", "Could not load applications", e.message)); } }

    $("#q").on("input", ST.debounce(render, 200)); $("#fStatus").on("change", render);

    $("#list").on("click", "[data-view]", async function () {
        const id = $(this).data("view");
        $("#viewBody").html(ST.loading()); const modal = bootstrap.Modal.getOrCreateInstance("#viewModal"); modal.show();
        try {
            const a = await ST.get("/api/applications/" + id);
            $("#viewTitle").text(a.scholarship); $("#viewTrack").attr("href", "/tracking.html?id=" + a._id);
            $("#viewBody").html(`<div class="d-flex flex-wrap gap-3 align-items-center mb-4"><span class="tag">${ST.esc(a.applicationNo)}</span>${ST.statusBadge(a.status)}<span class="text-muted small">Applied ${ST.date(a.createdAt)}</span></div>${ST.appDetailHTML(a)}
                <h6 class="section-title"><i class="bi bi-paperclip"></i>Documents</h6>${a.documents.length ? a.documents.map(d => `<div class="d-flex align-items-center gap-2 py-1"><i class="bi bi-${ST.docIcon(d.originalName)} text-primary"></i><a href="/api/documents/${d._id}/file" target="_blank" rel="noopener">${ST.esc(d.docType)}</a><span class="text-muted small">${ST.esc(d.originalName)}</span></div>`).join("") : '<div class="text-muted">No documents uploaded.</div>'}`);
        } catch (e) { $("#viewBody").html(ST.empty("exclamation-circle", "Could not load", e.message)); }
    });

    $("#list").on("click", "[data-withdraw]", async function () {
        const id = $(this).data("withdraw");
        if (!(await ST.confirm("Withdraw this application?", "Your application and uploaded documents will be deleted. You can apply again before the deadline.", "Withdraw application", true))) return;
        try { const r = await ST.del("/api/applications/" + id); ST.toast(r.message, "success"); load(); } catch (e) { ST.fail(e); }
    });
    load();
});
