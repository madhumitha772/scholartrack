$(async function () {
    await ST.initApp({ role: "admin", active: "students", title: "Students", crumb: "Administration" });
    let all = [];
    async function load() {
        try { all = await ST.get("/api/admin/students", { q: $("#q").val().trim() }); render(); } catch (e) { ST.fail(e); }
    }
    function render() {
        $("#count").text(all.length === 1 ? "1 student" : all.length + " students");
        $("#list").html(all.length ? `<table class="table table-hover"><thead><tr><th>Student</th><th>College and course</th><th>CGPA</th><th>Family income</th><th>Applications</th><th>Joined</th><th class="text-end">Actions</th></tr></thead><tbody>${all.map(u => `
            <tr><td><div class="d-flex align-items-center gap-3"><span class="avatar" style="${u.active === false ? "background:#9AA7B4" : ""}">${ST.esc(ST.initials(u.name))}</span><div><div class="cell-main">${ST.esc(u.name)} ${u.active === false ? '<span class="tag ms-1">Deactivated</span>' : ""}</div><div class="cell-sub">${ST.esc(u.email)}</div></div></div></td>
            <td><div class="cell-main">${ST.esc(u.college || "–")}</div><div class="cell-sub">${ST.esc(u.course || "")}${u.year ? " · Year " + u.year : ""}</div></td>
            <td>${u.cgpa ?? "–"}</td><td>${u.familyIncome != null ? ST.inr(u.familyIncome) : "–"}</td>
            <td>${u.applications} <span class="text-muted small">(${u.approvedCount} approved)</span></td><td>${ST.date(u.createdAt)}</td>
            <td class="text-end text-nowrap"><button class="btn btn-soft btn-sm" data-view="${u._id}">View</button> <button class="btn btn-soft btn-sm ${u.active === false ? "" : "text-danger"}" data-toggle="${u._id}" data-active="${u.active === false ? 1 : 0}">${u.active === false ? "Activate" : "Deactivate"}</button></td></tr>`).join("")}</tbody></table>`
            : ST.empty("people", "No students found", "Students appear here after they register."));
    }
    $("#q").on("input", ST.debounce(load, 300));
    $("#list").on("click", "[data-view]", async function () {
        $("#stuBody").html(ST.loading()); bootstrap.Modal.getOrCreateInstance("#stuModal").show();
        try {
            const { student: s, applications } = await ST.get("/api/admin/students/" + $(this).data("view"));
            $("#stuTitle").text(s.name);
            $("#stuBody").html(`<div class="row g-3 mb-4">${ST.kv("Email", s.email)}${ST.kv("Phone", s.phone)}${ST.kv("Date of birth", s.dob ? ST.date(s.dob) : "")}${ST.kv("Gender", s.gender)}${ST.kv("State", s.state)}${ST.kv("Category", s.category)}
                ${ST.kv("College", s.college)}${ST.kv("Course", s.course)}${ST.kv("Year", s.year)}${ST.kv("CGPA", s.cgpa)}${ST.kv("Family income", s.familyIncome != null ? ST.inr(s.familyIncome) : "")}${ST.kv("Registered", ST.date(s.createdAt))}</div>
                <h6 class="section-title"><i class="bi bi-folder2-open"></i>Applications (${applications.length})</h6>${applications.length ? applications.map(a => `<div class="d-flex justify-content-between align-items-center gap-3 py-2" style="border-bottom:1px solid var(--line)"><div><div class="cell-main">${ST.esc(a.scholarship)}</div><div class="cell-sub">${ST.esc(a.applicationNo)} · ${ST.date(a.createdAt)}</div></div><div class="d-flex align-items-center gap-2">${ST.statusBadge(a.status)}<a class="btn btn-soft btn-sm" href="/admin/application-details.html?id=${a._id}">Open</a></div></div>`).join("") : '<div class="text-muted">No applications yet.</div>'}`);
        } catch (e) { $("#stuBody").html(ST.empty("exclamation-circle", "Could not load student", e.message)); }
    });
    $("#list").on("click", "[data-toggle]", async function () {
        const active = !!$(this).data("active");
        if (!active && !(await ST.confirm("Deactivate this account?", "The student will no longer be able to log in. Their applications are kept.", "Deactivate", true))) return;
        try { const r = await ST.put(`/api/admin/students/${$(this).data("toggle")}/active`, { active }); ST.toast(r.message, "success"); load(); } catch (e) { ST.fail(e); }
    });
    load();
});
