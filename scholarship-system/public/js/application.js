$(async function () {
    const user = await ST.initApp({ role: "student", active: "scholarships", title: "Apply for scholarship", crumb: "Scholarships" });
    ST.fillCommon();
    const sid = ST.query("scholarship");
    if (!sid) { location.replace("/scholarships.html"); return; }

    const message = (icon, title, text, action) => $("#applyBody").html(`<div class="panel">${ST.empty(icon, title, text, action)}</div>`);
    let s, profile;
    try { [s, profile] = await Promise.all([ST.get("/api/scholarships/" + sid), ST.get("/api/profile").then(r => r.profile)]); }
    catch (e) { return message("exclamation-circle", "Scholarship not found", e.message, '<a class="btn btn-primary" href="/scholarships.html">Find scholarships</a>'); }

    if (s.myApplication) return message("check2-circle", "You have already applied", `Your application ${s.myApplication.applicationNo} is ${s.myApplication.status.toLowerCase()}.`, `<a class="btn btn-primary" href="/tracking.html?id=${s.myApplication._id}">Track application</a>`);
    if (!ST.isOpen(s)) return message("lock", "Applications are closed", "The deadline for this scholarship has passed.", '<a class="btn btn-primary" href="/scholarships.html">Find other scholarships</a>');

    const chk = s.eligibility_check || { eligible: true, reasons: [], missing: [] };
    $("#applyHead").html(`<div class="panel panel-pad mb-4"><div class="d-flex flex-wrap justify-content-between align-items-center gap-3">
        <div><div class="text-muted small">${ST.esc(s.provider || "")}</div><h2 class="h3 mb-1">${ST.esc(s.name)}</h2>
        <div class="d-flex flex-wrap gap-2"><span class="tag gold">${ST.inr(s.amount)}</span>${ST.deadlineHTML(s)}</div></div>
        <a class="btn btn-soft" href="/scholarship-details.html?id=${s._id}" target="_blank" rel="noopener">View eligibility</a></div>
        ${chk.eligible ? "" : `<div class="alert alert-warning mt-3 mb-0"><strong>Your saved profile may not meet some criteria:</strong><ul class="mb-1 ps-3">${chk.reasons.map(r => `<li>${ST.esc(r)}</li>`).join("")}</ul><span class="small">If your details have changed, correct them below. Eligibility is checked again when you submit.</span></div>`}</div>`);

    const required = s.requiredDocuments || [];
    const files = {};
    const OK = /\.(pdf|jpe?g|png)$/i, MAX = 5 * 1024 * 1024;
    let step = 1;
    const F = ["name", "email", "phone", "dob", "address", "college", "course", "department", "year", "cgpa", "previousMarks", "familyIncome", "guardianOccupation", "category", "achievements", "extracurricular"];

    $("#applyBody").html(`
      <div class="steps" id="steps">${["Personal", "Academic and financial", "Other and documents", "Review"].map((t, i) => `<div class="s" data-s="${i + 1}"><span class="n">${i + 1}</span>${t}</div>`).join("")}</div>
      <form id="applyForm" novalidate><div class="panel"><div class="panel-body">
        <section data-step="1"><h5 class="mb-3">Personal information</h5><div class="row g-3">
          <div class="col-md-6"><label class="form-label" for="name">Full name</label><input class="form-control" id="name" required></div>
          <div class="col-md-6"><label class="form-label" for="email">Email</label><input type="email" class="form-control" id="email" readonly></div>
          <div class="col-md-6"><label class="form-label" for="phone">Phone</label><input class="form-control" id="phone" inputmode="tel" required></div>
          <div class="col-md-6"><label class="form-label" for="dob">Date of birth</label><input type="date" class="form-control" id="dob" required></div>
          <div class="col-12"><label class="form-label" for="address">Address</label><textarea class="form-control" id="address" rows="3" required placeholder="House number, street, city, state, PIN code"></textarea></div></div></section>
        <section data-step="2" class="d-none"><h5 class="mb-3">Academic information</h5><div class="row g-3 mb-4">
          <div class="col-12"><label class="form-label" for="college">College</label><input class="form-control" id="college" required></div>
          <div class="col-md-6"><label class="form-label" for="course">Course</label><input class="form-control" id="course" list="courseList" required><datalist id="courseList"></datalist></div>
          <div class="col-md-6"><label class="form-label" for="department">Department</label><input class="form-control" id="department"></div>
          <div class="col-md-4"><label class="form-label" for="year">Year</label><select class="form-select" id="year" required><option value="">Year</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div>
          <div class="col-md-4"><label class="form-label" for="cgpa">CGPA (out of 10)</label><input type="number" step="0.01" min="0" max="10" class="form-control" id="cgpa" required>${s.minCgpa > 0 ? `<div class="form-text">Minimum required: ${s.minCgpa}</div>` : ""}</div>
          <div class="col-md-4"><label class="form-label" for="previousMarks">Previous semester marks (%)</label><input type="number" min="0" max="100" class="form-control" id="previousMarks"></div></div>
          <h5 class="mb-3">Financial information</h5><div class="row g-3">
          <div class="col-md-6"><label class="form-label" for="familyIncome">Annual family income (₹)</label><input type="number" min="0" step="1000" class="form-control" id="familyIncome" required>${s.incomeLimit > 0 ? `<div class="form-text">Limit: ${ST.inr(s.incomeLimit)}</div>` : ""}</div>
          <div class="col-md-6"><label class="form-label" for="guardianOccupation">Parent / guardian occupation</label><input class="form-control" id="guardianOccupation" placeholder="e.g. Farmer, Teacher"></div></div></section>
        <section data-step="3" class="d-none"><h5 class="mb-3">Other information</h5><div class="row g-3 mb-4">
          <div class="col-md-6"><label class="form-label" for="category">Category</label><select class="form-select" id="category" data-fill="category" required></select></div>
          <div class="col-12"><label class="form-label" for="achievements">Achievements</label><textarea class="form-control" id="achievements" rows="2" placeholder="Awards, ranks, publications"></textarea></div>
          <div class="col-12"><label class="form-label" for="extracurricular">Extracurricular activities</label><textarea class="form-control" id="extracurricular" rows="2" placeholder="Clubs, sports, volunteering"></textarea></div></div>
          <h5 class="mb-1">Documents</h5><p class="text-muted small mb-3">${required.length ? "Attach each document below. PDF, JPG or PNG, up to 5 MB each." : "This scholarship does not ask for specific documents. You may attach supporting files after submitting."}</p>
          <div class="d-grid gap-2" id="slots">${required.map((t, i) => `<div class="doc-slot" data-i="${i}"><span class="d-icon"><i class="bi bi-file-earmark-arrow-up"></i></span><div class="flex-grow-1 overflow-hidden"><div class="d-name">${ST.esc(t)}</div><div class="d-file">No file chosen</div></div>
            <label class="btn btn-sm btn-primary file-btn mb-0">Choose file<input type="file" accept=".pdf,.jpg,.jpeg,.png" data-i="${i}"></label></div>`).join("")}</div></section>
        <section data-step="4" class="d-none"><h5 class="mb-3">Review your application</h5><div id="review"></div>
          <div class="form-check mt-3"><input class="form-check-input" type="checkbox" id="declare"><label class="form-check-label" for="declare">I confirm that the information and documents I have provided are true and complete.</label></div></section>
      </div>
      <div class="d-flex justify-content-between p-3 border-top"><button type="button" class="btn btn-soft" id="backBtn">Back</button><div><span class="text-danger small me-3 d-none" id="stepError"></span><button type="button" class="btn btn-primary" id="nextBtn">Continue</button><button type="submit" class="btn btn-gold d-none" id="submitBtn">Submit application</button></div></div></div></form>`);
    ST.fillCommon();

    // pre-fill from profile
    F.forEach(f => { const v = profile[f]; if ($("#" + f).length && v !== null && v !== undefined) $("#" + f).val(f === "dob" ? ST.inputDate(v) : v); });
    $("#email").val(profile.email); $("#dob").attr("max", new Date().toISOString().slice(0, 10));

    const err = (m) => $("#stepError").text(m).toggleClass("d-none", !m);
    const val = (id) => $("#" + id).val();
    function validate(n) {
        err(""); $(".is-invalid").removeClass("is-invalid");
        const need = { 1: ["name", "phone", "dob", "address"], 2: ["college", "course", "year", "cgpa", "familyIncome"], 3: ["category"] }[n] || [];
        const bad = need.filter(f => !String(val(f)).trim()); bad.forEach(f => $("#" + f).addClass("is-invalid"));
        if (bad.length) { err("Fill in the highlighted fields."); $("#" + bad[0]).trigger("focus"); return false; }
        if (n === 1 && !/^[0-9+\-\s]{10,15}$/.test(val("phone").trim())) { $("#phone").addClass("is-invalid"); err("Enter a valid phone number."); return false; }
        if (n === 2) {
            const c = Number(val("cgpa")); if (c < 0 || c > 10) { $("#cgpa").addClass("is-invalid"); err("CGPA must be between 0 and 10."); return false; }
            if (s.minCgpa > 0 && c < s.minCgpa) { $("#cgpa").addClass("is-invalid"); err(`This scholarship needs a CGPA of at least ${s.minCgpa}.`); return false; }
            if (s.incomeLimit > 0 && Number(val("familyIncome")) > s.incomeLimit) { $("#familyIncome").addClass("is-invalid"); err(`Family income must be at most ${ST.inr(s.incomeLimit)}.`); return false; }
        }
        if (n === 3) {
            if (s.category !== "All" && val("category") !== s.category) { $("#category").addClass("is-invalid"); err(`This scholarship is open to the ${s.category} category.`); return false; }
            const missing = required.filter((t, i) => !files[i]);
            if (missing.length) { err("Attach: " + missing.join(", ")); return false; }
        }
        return true;
    }

    function collect() {
        return {
            scholarshipId: s._id,
            personal: { name: val("name"), email: val("email"), phone: val("phone"), dob: val("dob"), address: val("address") },
            academic: { college: val("college"), course: val("course"), department: val("department"), year: val("year"), cgpa: val("cgpa"), previousMarks: val("previousMarks") },
            financial: { familyIncome: val("familyIncome"), guardianOccupation: val("guardianOccupation") },
            other: { category: val("category"), achievements: val("achievements"), extracurricular: val("extracurricular") }
        };
    }

    function show(n) {
        step = n;
        $("section[data-step]").addClass("d-none").filter(`[data-step=${n}]`).removeClass("d-none");
        $("#steps .s").each(function () { const i = +$(this).data("s"); $(this).toggleClass("active", i === n).toggleClass("done", i < n); });
        $("#backBtn").toggleClass("invisible", n === 1); $("#nextBtn").toggleClass("d-none", n === 4); $("#submitBtn").toggleClass("d-none", n !== 4); err("");
        if (n === 4) {
            const d = collect();
            $("#review").html(ST.appDetailHTML(d) + `<h6 class="section-title"><i class="bi bi-paperclip"></i>Documents</h6>${required.length ? required.map((t, i) => `<div class="d-flex align-items-center gap-2 py-1"><i class="bi bi-file-earmark-check text-primary"></i><span class="fw-semibold">${ST.esc(t)}</span><span class="text-muted small">${ST.esc(files[i]?.name || "")}</span></div>`).join("") : '<div class="text-muted">None attached.</div>'}`);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    $("#nextBtn").on("click", () => { if (validate(step)) show(step + 1); });
    $("#backBtn").on("click", () => show(step - 1));

    $("#slots").on("change", "input[type=file]", function () {
        const i = +$(this).data("i"), f = this.files[0], $slot = $(this).closest(".doc-slot");
        if (!f) return;
        if (!OK.test(f.name)) { ST.toast("Only PDF, JPG and PNG files are allowed.", "error"); this.value = ""; return; }
        if (f.size > MAX) { ST.toast("File is too large. The limit is 5 MB.", "error"); this.value = ""; return; }
        files[i] = f; $slot.addClass("has-file").find(".d-file").text(`${f.name} · ${ST.fileSize(f.size)}`); $slot.find(".d-icon i").attr("class", "bi bi-" + ST.docIcon(f.name)); $slot.find(".file-btn").contents().first().replaceWith("Replace");
        $slot.find(".file-btn").removeClass("btn-primary").addClass("btn-soft"); err("");
    });

    $("#applyForm").on("submit", async function (e) {
        e.preventDefault();
        if (step < 4) { if (validate(step)) show(step + 1); return; }
        if (!$("#declare").is(":checked")) return err("Tick the confirmation to submit.");
        const $btn = $("#submitBtn"); ST.busy($btn, true, "Submitting");
        try {
            const res = await ST.post("/api/applications", collect());
            const failed = [];
            for (let i = 0; i < required.length; i++) {
                const fd = new FormData(); fd.append("docType", required[i]); fd.append("document", files[i]);
                try { await ST.upload(`/api/applications/${res.applicationId}/documents`, fd); } catch (_) { failed.push(required[i]); }
            }
            ST.toast(failed.length ? `Application submitted. ${failed.join(", ")} could not be uploaded; add it from the tracking page.` : "Application submitted successfully.", failed.length ? "warning" : "success");
            setTimeout(() => location.href = "/tracking.html?id=" + res.applicationId, 900);
        } catch (e2) {
            ST.busy($btn, false); err(e2.message);
            if (e2.status === 409) setTimeout(() => location.href = "/my-applications.html", 1500);
        }
    });
    show(1);
});
