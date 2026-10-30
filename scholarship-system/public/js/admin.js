$(async function () {
    await ST.initApp({ role: "admin", active: "dashboard", title: "Admin dashboard", crumb: "Administration" });
    try {
        const d = await ST.get("/api/admin/stats");
        $("#kStudents").text(d.students); $("#kSch").text(d.scholarships); $("#kApps").text(d.applications);
        $("#kPending").text(d.pending); $("#kApproved").text(d.approved); $("#kRejected").text(d.rejected);

        $("#recent").html(d.recent.length ? `<table class="table table-hover"><thead><tr><th>Student</th><th>Scholarship</th><th>Status</th><th class="text-end">Action</th></tr></thead><tbody>${d.recent.map(a => `
            <tr><td><div class="cell-main">${ST.esc(a.personal?.name)}</div><div class="cell-sub">${ST.esc(a.applicationNo)}</div></td><td>${ST.esc(a.scholarship)}</td><td>${ST.statusBadge(a.status)}</td>
            <td class="text-end"><a class="btn btn-soft btn-sm" href="/admin/application-details.html?id=${a._id}">Review</a></td></tr>`).join("")}</tbody></table>`
            : ST.empty("inbox", "No applications yet", "Applications appear here as soon as students submit them."));

        $("#closing").html(d.closing.length ? d.closing.map(x => `<div class="d-flex justify-content-between align-items-center gap-3 p-3" style="border-bottom:1px solid var(--line)"><div class="overflow-hidden"><div class="cell-main text-truncate">${ST.esc(x.name)}</div><div class="cell-sub">${ST.inr(x.amount)}</div></div>${ST.deadlineHTML(x)}</div>`).join("")
            : ST.empty("calendar-check", "Nothing closing soon", "No active scholarships have an upcoming deadline."));

        const colors = { "Submitted": "#2563A8", "Under Review": "#D9A23A", "Documents Pending": "#C2570C", "Documents Verified": "#0F766E", "Approved": "#1E8449", "Rejected": "#BE3A34" };
        const labels = Object.keys(d.byStatus);
        Chart.defaults.font.family = "Figtree, system-ui, sans-serif"; Chart.defaults.color = "#5F6F80";
        if (d.applications) new Chart($("#statusChart"), { type: "doughnut", data: { labels, datasets: [{ data: labels.map(l => d.byStatus[l]), backgroundColor: labels.map(l => colors[l]), borderWidth: 2, borderColor: "#fff" }] },
            options: { maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true, font: { family: "Figtree" } } } } } });
        else $("#statusChart").parent().html(ST.empty("pie-chart", "No data yet", "The chart fills in once applications arrive."));
    } catch (e) { ST.fail(e); }
});
