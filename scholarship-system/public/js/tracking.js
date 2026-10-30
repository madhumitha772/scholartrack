$(async function () {
    await ST.initApp({ role: "student", active: "applications", title: "Track application", crumb: "My applications" });
    const id = ST.query("id");
    const FINAL = ["Approved", "Rejected"];
    const MAX = 5 * 1024 * 1024, OK = /\.(pdf|jpe?g|png)$/i;

    async function showPicker() {
        const list = await ST.get("/api/applications");
        if (!list.length) { $("#trackBody").html(`<div class="panel">${ST.empty("signpost-split", "No applications to track", "Apply for a scholarship and its progress will appear here.", '<a class="btn btn-primary" href="/scholarships.html">Find scholarships</a>')}</div>`); return; }
        $("#trackBody").html(`<div class="panel"><div class="panel-head"><h5>Choose an application</h5></div><div class="list-group list-group-flush">${list.map(a => `
            <a class="list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-3 py-3 px-4" href="/tracking.html?id=${a._id}">
            <div><div class="cell-main">${ST.esc(a.scholarship)}</div><div class="cell-sub">${ST.esc(a.applicationNo)} · Applied ${ST.date(a.createdAt)}</div></div>${ST.statusBadge(a.status)}</a>`).join("")}</div></div>`);
    }

    async function load() {
        let a;
        try { a = await ST.get("/api/applications/" + id); }
        catch (e) { $("#trackBody").html(`<div class="panel">${ST.empty("exclamation-circle", "Application not found", e.message, '<a class="btn btn-primary" href="/my-applications.html">My applications</a>')}</div>`); return; }
        render(a);
    }

    function docsPanel(a) {
        const required = (a.scholarshipDetails?.requiredDocuments || []);
        const byType = Object.fromEntries(a.documents.map(d => [d.docType, d]));
        const types = [...required, ...a.documents.map(d => d.docType).filter(t => !required.includes(t))];
        const locked = FINAL.includes(a.status);
        if (!types.length) return `<div class="text-muted">No documents were requested for this scholarship.</div>`;
        return `<div class="d-grid gap-2">${types.map(t => {
            const d = byType[t];
            return `<div class="doc-slot ${d ? "has-file" : ""}"><span class="d-icon"><i class="bi bi-${d ? ST.docIcon(d.originalName) : "file-earmark-arrow-up"}"></i></span>
                <div class="flex-grow-1 overflow-hidden"><div class="d-name">${ST.esc(t)} ${d ? (d.verified ? '<span class="tag teal ms-1"><i class="bi bi-patch-check-fill"></i>Verified</span>' : '<span class="tag ms-1">Awaiting check</span>') : '<span class="tag gold ms-1">Missing</span>'}</div>
                <div class="d-file">${d ? `<a href="/api/documents/${d._id}/file" target="_blank" rel="noopener">${ST.esc(d.originalName)}</a> · ${ST.fileSize(d.size)}` : "PDF, JPG or PNG up to 5 MB"}</div></div>
                ${locked ? "" : `<label class="btn btn-sm ${d ? "btn-soft" : "btn-primary"} file-btn mb-0">${d ? "Replace" : "Upload"}<input type="file" accept=".pdf,.jpg,.jpeg,.png" data-type="${ST.esc(t)}"></label>`}</div>`;
        }).join("")}</div>`;
    }

    function render(a) {
        document.title = `${a.applicationNo} | ScholarTrack`;
        const attention = a.status === "Documents Pending";
        $("#trackBody").html(`
        <div class="panel panel-pad mb-4"><div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
            <div><div class="d-flex flex-wrap align-items-center gap-2 mb-1"><span class="tag">${ST.esc(a.applicationNo)}</span>${ST.statusBadge(a.status)}</div>
            <h2 class="h3 mb-1">${ST.esc(a.scholarship)}</h2><div class="text-muted">Applied ${ST.date(a.createdAt)} · ${ST.inr(a.amount)} · Last updated ${ST.timeAgo(a.updatedAt)}</div></div>
            <div class="page-actions"><a class="btn btn-soft" href="/scholarship-details.html?id=${a.scholarshipId}">Scholarship details</a><button class="btn btn-soft" data-print><i class="bi bi-printer me-1"></i>Print</button></div></div></div>
        ${attention ? `<div class="alert alert-warning d-flex gap-3 mb-4"><i class="bi bi-exclamation-triangle-fill fs-5"></i><div><strong>The scholarship team needs more from you.</strong><div>${ST.esc(a.remarks || "Please upload the requested documents.")}</div></div></div>` : ""}
        <div class="row g-4"><div class="col-lg-7">
            <div class="panel mb-4"><div class="panel-head"><h5>Application progress</h5></div><div class="panel-body">${ST.trackerHTML(a)}</div></div>
            <div class="panel"><div class="panel-head"><h5>Activity</h5></div><div class="panel-body py-2"><ul class="log">${[...a.history].reverse().map(h => `<li><span class="dot"></span><div><div class="fw-semibold">${ST.esc(h.status)} <span class="text-muted fw-normal small ms-1">${ST.dateTime(h.at)}</span></div><div class="text-muted small">${ST.esc(h.note)}${h.by ? " · " + ST.esc(h.by) : ""}</div></div></li>`).join("")}</ul></div></div>
        </div><div class="col-lg-5">
            <div class="panel mb-4"><div class="panel-head"><h5>Documents</h5></div><div class="panel-body" id="docsBox">${docsPanel(a)}</div></div>
            ${a.remarks && !attention ? `<div class="panel panel-pad"><h6 class="mb-2">Remarks from the reviewer</h6><div class="note-box pre-line">${ST.esc(a.remarks)}</div></div>` : ""}
        </div></div>`);
        $("#docsBox").on("change", "input[type=file]", async function () {
            const file = this.files[0], type = $(this).data("type"); if (!file) return;
            if (!OK.test(file.name)) { ST.toast("Only PDF, JPG and PNG files are allowed.", "error"); this.value = ""; return; }
            if (file.size > MAX) { ST.toast("File is too large. The limit is 5 MB.", "error"); this.value = ""; return; }
            const fd = new FormData(); fd.append("docType", type); fd.append("document", file);
            ST.toast("Uploading " + type + "…");
            try { await ST.upload(`/api/applications/${id}/documents`, fd); ST.toast(type + " uploaded.", "success"); load(); } catch (e) { ST.fail(e); this.value = ""; }
        });
    }

    if (!id) await showPicker(); else await load();
});
