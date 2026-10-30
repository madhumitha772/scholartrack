$(async function () {
    const user = await ST.publicNav("scholarships"); ST.publicFooter();
    ST.fillSelect($("#fCategory"), ST.CATEGORIES, "Any category");
    ST.fillSelect($("#fCourse"), [], "Any course"); ST.fillSelect($("#fState"), ST.STATES, "Any state");
    if (user && user.role === "student") $("#matchBtn").removeClass("d-none");

    try {
        const meta = await ST.get("/api/scholarships/meta/filters");
        const courses = [...new Set([...meta.courses, ...ST.COURSES])].sort();
        ST.fillSelect($("#fCourse"), courses, "Any course");
    } catch (_) { /* filters still work without meta */ }

    const params = () => ({
        q: $("#q").val().trim(), category: $("#fCategory").val(), course: $("#fCourse").val(), gender: $("#fGender").val(),
        state: $("#fState").val(), cgpa: $("#fCgpa").val(), income: $("#fIncome").val(), sort: $("#fSort").val(),
        open: $("#fOpen").is(":checked") ? "true" : ""
    });

    let seq = 0;
    async function load() {
        const mine = ++seq;
        $("#results").html(`<div class="col-12">${ST.loading("Searching")}</div>`);
        const p = params(); Object.keys(p).forEach(k => { if (!p[k]) delete p[k]; });
        try {
            const list = await ST.get("/api/scholarships", p);
            if (mine !== seq) return;
            $("#resultCount").text(list.length === 1 ? "1 scholarship found" : `${list.length} scholarships found`);
            $("#results").html(list.length ? list.map(ST.scholarshipCard).join("")
                : `<div class="col-12"><div class="panel">${ST.empty("search", "No scholarships match these filters", "Try removing a filter or switching off “Only open scholarships”.")}</div></div>`);
        } catch (e) { $("#results").html(`<div class="col-12"><div class="panel">${ST.empty("wifi-off", "Could not load scholarships", e.message)}</div></div>`); }
    }

    $("#searchForm").on("submit", e => { e.preventDefault(); load(); });
    $("#q").on("input", ST.debounce(load, 350));
    $("#fCgpa, #fIncome").on("input", ST.debounce(load, 450));
    $("#fCategory, #fCourse, #fGender, #fState, #fSort, #fOpen").on("change", load);
    $("#clearBtn").on("click", () => { $("#q, #fCgpa, #fIncome").val(""); $("#fCategory, #fCourse, #fGender, #fState").val(""); $("#fSort").val("deadline"); $("#fOpen").prop("checked", true); load(); });

    $("#matchBtn").on("click", async function () {
        try {
            const { profile: p } = await ST.get("/api/profile");
            if (p.cgpa != null) $("#fCgpa").val(p.cgpa);
            if (p.familyIncome != null) $("#fIncome").val(p.familyIncome);
            if (p.category) $("#fCategory").val(p.category);
            if (p.gender && p.gender !== "Other") $("#fGender").val(p.gender);
            if (p.state) $("#fState").val(p.state);
            if (p.course) { const hit = $("#fCourse option").filter((_, o) => o.value.toLowerCase() === p.course.toLowerCase()); if (hit.length) $("#fCourse").val(hit.val()); }
            ST.toast("Filters set from your profile.", "success"); load();
        } catch (e) { ST.fail(e); }
    });

    load();
});
