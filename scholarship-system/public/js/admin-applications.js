$(async function () {
    await ST.initApp({ role: "admin", active: "applications", title: "Applications", crumb: "Administration" });
    ST.STATUSES.forEach(s => $("#fStatus").append(`<option>${s}</option>`));
    let all = [];

    function render() {
        const q = $("#q").val().trim().toLowerCase(), st = $("#fStatus").val(), sort = $("#fSort").val();
        let rows = all.filter(a => (st === "All" || a.status === st) && (!q || [a.applicationNo, a.scholarship, a.personal?.name, a.personal?.email, a.academic?.college].join(" ").toLowerCase().includes(q)));
        rows.sort((x, y) => sort === "cgpa" ? y.academic.cgpa - x.academic.cgpa : sort === "old" ? new Date(x.createdAt) - new Date(y.createdAt) : new Date(y.createdAt) - new Date(x.createdAt));
        $("#list").html(rows.length ? `<table class="table table-hover"><thead><tr><th>Application</th><th>Student</th><th>CGPA</th><th>Family income</th><th>Documents</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>${rows.map(a => {
            const final = ["Approved", "Rejected"].includes(a.status);
            return `<tr><td><div class="cell-main">${ST.esc(a.scholarship)}</div><div class="cell-sub">${ST.esc(a.applicationNo)} · ${ST.date(a.createdAt)}</div></td>
            <td><div class="cell-main">${ST.esc(a.personal?.name)}</div><div class="cell-sub">${ST.esc(a.academic?.college)}</div></td>
            <td>${a.academic?.cgpa}</td><td>${ST.inr(a.financial?.familyIncome)}</td>
            <td><span class="tag ${a.docCount && a.docVerified === a.docCount ? "teal" : ""}"><i class="bi bi-paperclip"></i>${a.docVerified}/${a.docCount} verified</span></td><td>${ST.statusBadge(a.status)}</td>
            <td class="text-end text-nowrap"><a class="btn btn-soft btn-sm" href="/admin/application-details.html?id=${a._id}">View</a>
              ${final ? "" : `<button class="btn btn-sm btn-outline-primary" data-act="Approved" data-id="${a._id}">Approve</button> <button class="btn btn-sm btn-outline-danger" data-act="Rejected" data-id="${a._id}">Reject</button>`}
              <button class="btn btn-soft btn-sm" data-act="" data-id="${a._id}" title="Change status"><i class="bi bi-arrow-repeat"></i></button></td></tr>`; }).join("")}</tbody></table>`
            : ST.empty("inbox", all.length ? "No applications match" : "No applications yet", all.length ? "Try a different search or status." : "Applications appear here as soon as students submit them."));
    }

    async function load() { try { all = await ST.get("/api/applications"); render(); } catch (e) { ST.fail(e); $("#list").html(ST.empty("wifi-off", "Could not load applications", e.message)); } }
    $("#q").on("input", ST.debounce(render, 200)); $("#fStatus, #fSort").on("change", render);
    $("#list").on("click", "[data-act]", function () {
        const app = all.find(a => a._id === $(this).data("id")), act = $(this).data("act");
        ST.openStatusModal(app, act || null, load);
    });
    load();
});
