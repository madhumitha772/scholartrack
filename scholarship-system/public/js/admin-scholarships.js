$(async function () {
    await ST.initApp({ role: "admin", active: "scholarships", title: "Scholarships", crumb: "Administration" });
    ST.fillSelect($("#state"), ST.STATES, "All"); $("#state option:first").val("All");
    $("#courseList").html(ST.COURSES.map(c => `<option value="${ST.esc(c)}">`).join(""));
    let all = [], editing = null;
    const modal = new bootstrap.Modal("#schModal");
    const FIELDS = ["name", "provider", "description", "amount", "deadline", "status", "eligibility", "minCgpa", "incomeLimit", "category", "gender", "course", "state", "requiredDocuments", "selectionCriteria", "contactEmail", "contactPhone"];

    function render() {
        const q = $("#q").val().trim().toLowerCase(), st = $("#fStatus").val();
        const rows = all.filter(s => (st === "All" || s.status === st) && (!q || (s.name + " " + s.provider).toLowerCase().includes(q)));
        $("#list").html(rows.length ? `<table class="table table-hover"><thead><tr><th>Scholarship</th><th>Amount</th><th>Eligibility</th><th>Deadline</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>${rows.map(s => {
            const open = ST.isOpen(s);
            return `<tr><td><div class="cell-main">${ST.esc(s.name)}</div><div class="cell-sub">${ST.esc(s.provider)}</div></td><td class="fw-semibold">${ST.inr(s.amount)}</td>
            <td><div class="d-flex flex-wrap gap-1">${s.minCgpa > 0 ? `<span class="tag">CGPA ${s.minCgpa}+</span>` : ""}${s.incomeLimit > 0 ? `<span class="tag">≤ ${ST.inr(s.incomeLimit)}</span>` : ""}${s.category !== "All" ? `<span class="tag teal">${ST.esc(s.category)}</span>` : ""}${s.gender !== "All" ? `<span class="tag teal">${ST.esc(s.gender)}</span>` : ""}${!s.minCgpa && !s.incomeLimit && s.category === "All" && s.gender === "All" ? '<span class="text-muted small">Open to all</span>' : ""}</div></td>
            <td>${ST.date(s.deadline)}<div class="cell-sub">${open ? ST.daysLeft(s.deadline) + " days left" : "Ended"}</div></td>
            <td>${open ? '<span class="status st-approved">Open</span>' : '<span class="status st-rejected">Closed</span>'}</td>
            <td class="text-end text-nowrap"><a class="btn btn-soft btn-sm" href="/scholarship-details.html?id=${s._id}" target="_blank" rel="noopener" title="View"><i class="bi bi-eye"></i></a>
              <button class="btn btn-soft btn-sm" data-edit="${s._id}" title="Edit"><i class="bi bi-pencil"></i></button>
              <button class="btn btn-soft btn-sm text-danger" data-del="${s._id}" title="Delete"><i class="bi bi-trash"></i></button></td></tr>`; }).join("")}</tbody></table>`
            : ST.empty("award", all.length ? "No scholarships match" : "No scholarships yet", all.length ? "Try a different search." : "Add your first scholarship so students can start applying."));
    }
    async function load() { try { all = await ST.get("/api/scholarships"); render(); } catch (e) { ST.fail(e); } }
    $("#q").on("input", ST.debounce(render, 200)); $("#fStatus").on("change", render);

    function openForm(s) {
        editing = s; $("#schForm")[0].reset(); $(".is-invalid").removeClass("is-invalid");
        $("#schTitle").text(s ? "Edit scholarship" : "Add scholarship");
        if (s) FIELDS.forEach(f => $("#" + f).val(f === "deadline" ? ST.inputDate(s[f]) : f === "requiredDocuments" ? (s[f] || []).join("\n") : (s[f] ?? "")));
        else { $("#course, #state, #category, #gender").each(function () { $(this).val("All"); }); $("#status").val("Active"); $("#minCgpa, #incomeLimit").val(0); }
        modal.show();
    }
    $("#addBtn").on("click", () => openForm(null));
    $("#list").on("click", "[data-edit]", function () { openForm(all.find(s => s._id === $(this).data("edit"))); });
    $("#list").on("click", "[data-del]", async function () {
        const s = all.find(x => x._id === $(this).data("del"));
        if (!(await ST.confirm("Delete this scholarship?", `“${s.name}” will be removed permanently. Scholarships that already have applications cannot be deleted; close them instead.`, "Delete scholarship", true))) return;
        try { const r = await ST.del("/api/scholarships/" + s._id); ST.toast(r.message, "success"); load(); } catch (e) { ST.fail(e); }
    });

    $("#schForm").on("submit", async function (e) {
        e.preventDefault(); $(".is-invalid").removeClass("is-invalid");
        const data = {}; FIELDS.forEach(f => data[f] = $("#" + f).val());
        const bad = ["name", "amount", "deadline"].filter(f => !String(data[f]).trim()); bad.forEach(f => $("#" + f).addClass("is-invalid"));
        if (bad.length) return ST.toast("Fill in the highlighted fields.", "error");
        if (Number(data.amount) < 0) return ST.toast("Amount cannot be negative.", "error");
        if (!data.course.trim()) data.course = "All";
        const $btn = $("#schSave"); ST.busy($btn, true, "Saving");
        try {
            const r = editing ? await ST.put("/api/scholarships/" + editing._id, data) : await ST.post("/api/scholarships", data);
            ST.toast(r.message, "success"); modal.hide(); load();
        } catch (err) { ST.fail(err); }
        ST.busy($btn, false);
    });
    load();
});
