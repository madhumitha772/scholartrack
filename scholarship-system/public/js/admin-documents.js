$(async function () {
    await ST.initApp({ role: "admin", active: "documents", title: "Documents", crumb: "Administration" });
    async function load() {
        const p = { q: $("#q").val().trim(), verified: $("#fVerified").val() }; Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; });
        try {
            const docs = await ST.get("/api/admin/documents", p);
            $("#list").html(docs.length ? `<table class="table table-hover"><thead><tr><th>Document</th><th>Student</th><th>Application</th><th>Uploaded</th><th>Verification</th><th class="text-end">Actions</th></tr></thead><tbody>${docs.map(d => `
                <tr><td><div class="d-flex align-items-center gap-3"><span class="d-icon kpi-icon i-ink" style="width:38px;height:38px;font-size:1.1rem"><i class="bi bi-${ST.docIcon(d.originalName)}"></i></span><div class="overflow-hidden"><div class="cell-main">${ST.esc(d.docType)}</div><div class="cell-sub text-truncate" style="max-width:220px">${ST.esc(d.originalName)} · ${ST.fileSize(d.size)}</div></div></div></td>
                <td>${ST.esc(d.application?.personal?.name)}</td><td><a href="/admin/application-details.html?id=${d.applicationId}">${ST.esc(d.application?.applicationNo)}</a><div class="cell-sub">${ST.esc(d.application?.scholarship)}</div></td><td>${ST.date(d.uploadedAt)}</td>
                <td>${d.verified ? '<span class="status st-verified">Verified</span>' : '<span class="status st-review">Awaiting</span>'}</td>
                <td class="text-end text-nowrap"><a class="btn btn-soft btn-sm" target="_blank" rel="noopener" href="/api/documents/${d._id}/file" title="Open"><i class="bi bi-eye"></i></a> <a class="btn btn-soft btn-sm" href="/api/documents/${d._id}/file?download=1" title="Download"><i class="bi bi-download"></i></a>
                <button class="btn btn-sm ${d.verified ? "btn-soft" : "btn-primary"}" data-verify="${d._id}" data-v="${d.verified ? 0 : 1}">${d.verified ? "Unverify" : "Verify"}</button></td></tr>`).join("")}</tbody></table>`
                : ST.empty("file-earmark-check", "No documents found", "Documents uploaded by students will appear here."));
        } catch (e) { ST.fail(e); }
    }
    $("#q").on("input", ST.debounce(load, 300)); $("#fVerified").on("change", load);
    $("#list").on("click", "[data-verify]", async function () {
        try { const r = await ST.put(`/api/documents/${$(this).data("verify")}/verify`, { verified: !!$(this).data("v") }); ST.toast(r.message, "success"); load(); } catch (e) { ST.fail(e); }
    });
    load();
});
