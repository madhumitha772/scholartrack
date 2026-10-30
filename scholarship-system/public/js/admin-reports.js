$(async function () {
    await ST.initApp({ role: "admin", active: "reports", title: "Reports", crumb: "Administration" });
    try {
        const r = await ST.get("/api/admin/reports");
        $("#rStudents").text(r.totalStudents); $("#rApps").text(r.totalApplications); $("#rFunds").text(ST.inr(r.fundsApproved)); $("#rRate").text(r.approvalRate + "%"); $("#rCgpa").text(r.avgCgpa || "–");

        const COL = { "Submitted": "#2563A8", "Under Review": "#D9A23A", "Documents Pending": "#C2570C", "Documents Verified": "#0F766E", "Approved": "#1E8449", "Rejected": "#BE3A34" };
        Chart.defaults.font.family = "Figtree"; Chart.defaults.color = "#5F6F80";
        const labels = Object.keys(r.byStatus);

        new Chart($("#monthChart"), { type: "bar", data: { labels: r.months.map(m => m.label), datasets: [{ label: "Applications", data: r.months.map(m => m.count), backgroundColor: "#0F766E", borderRadius: 6, maxBarThickness: 44 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#EDF1F4" } }, x: { grid: { display: false } } } } });
        new Chart($("#statusChart"), { type: "doughnut", data: { labels, datasets: [{ data: labels.map(l => r.byStatus[l]), backgroundColor: labels.map(l => COL[l]), borderWidth: 2, borderColor: "#fff" }] },
            options: { maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true } } } } });
        new Chart($("#schChart"), { type: "bar", data: { labels: r.byScholarship.map(s => s.name.length > 28 ? s.name.slice(0, 27) + "…" : s.name), datasets: [{ label: "Applications", data: r.byScholarship.map(s => s.total), backgroundColor: "#10243E", borderRadius: 5 }, { label: "Approved", data: r.byScholarship.map(s => s.approved), backgroundColor: "#F5B335", borderRadius: 5 }] },
            options: { indexAxis: "y", maintainAspectRatio: false, plugins: { legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true } } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#EDF1F4" } }, y: { grid: { display: false } } } } });
        new Chart($("#catChart"), { type: "doughnut", data: { labels: r.byCategory.map(c => c.name), datasets: [{ data: r.byCategory.map(c => c.count), backgroundColor: ["#10243E", "#0F766E", "#F5B335", "#2563A8", "#BE3A34", "#7C8DA0", "#1E8449"], borderWidth: 2, borderColor: "#fff" }] },
            options: { maintainAspectRatio: false, cutout: "60%", plugins: { legend: { position: "bottom", labels: { boxWidth: 10, usePointStyle: true } } } } });

        const total = r.totalApplications || 1;
        $("#summary").html(`<table class="table"><thead><tr><th>Status</th><th>Applications</th><th style="width:40%">Share</th></tr></thead><tbody>${labels.map(l => `<tr><td>${ST.statusBadge(l)}</td><td class="fw-semibold">${r.byStatus[l]}</td>
            <td><div class="d-flex align-items-center gap-3"><div class="meter flex-grow-1"><span style="width:${Math.round(r.byStatus[l] / total * 100)}%;background:${COL[l]}"></span></div><span class="small text-muted" style="width:38px">${Math.round(r.byStatus[l] / total * 100)}%</span></div></td></tr>`).join("")}</tbody></table>`);
    } catch (e) { ST.fail(e); }
});
