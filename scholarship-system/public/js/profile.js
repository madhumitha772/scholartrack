$(async function () {
    const user = await ST.initApp({ role: "student", active: "profile", title: "My profile" });
    ST.fillCommon();
    const fields = ["name", "phone", "dob", "gender", "state", "address", "college", "course", "department", "year", "cgpa", "category", "familyIncome"];
    let current = null;

    const fill = (p, pct) => {
        current = p;
        fields.forEach(f => $("#" + f).val(f === "dob" ? ST.inputDate(p[f]) : (p[f] ?? "")));
        $("#email").val(p.email); $("#pName").text(p.name); $("#pEmail").text(p.email); $("#pAvatar").text(ST.initials(p.name));
        $("#pPercent").text(pct + "%"); $("#pMeter").css("width", pct + "%");
    };
    const setEditing = (on) => {
        fields.forEach(f => $("#" + f).prop("disabled", !on));
        $("#editBtn").toggleClass("d-none", on); $("#cancelBtn, #saveBtn").toggleClass("d-none", !on);
    };

    try { const d = await ST.get("/api/profile"); fill(d.profile, d.completeness); setEditing(false); } catch (e) { ST.fail(e); }
    $("#dob").attr("max", new Date().toISOString().slice(0, 10));

    $("#editBtn").on("click", () => { setEditing(true); $("#name").trigger("focus"); });
    $("#cancelBtn").on("click", () => { fill(current, parseInt($("#pPercent").text())); setEditing(false); });

    $("#profileForm").on("submit", async function (e) {
        e.preventDefault();
        const data = {}; fields.forEach(f => data[f] = $("#" + f).val());
        if (!data.name.trim()) return ST.toast("Name cannot be empty.", "error");
        if (data.phone && !/^[0-9+\-\s]{10,15}$/.test(data.phone.trim())) return ST.toast("Enter a valid phone number.", "error");
        if (data.cgpa !== "" && (Number(data.cgpa) < 0 || Number(data.cgpa) > 10)) return ST.toast("CGPA must be between 0 and 10.", "error");
        const $btn = $("#saveBtn"); ST.busy($btn, true, "Saving");
        try { const r = await ST.put("/api/profile", data); fill(r.profile, r.completeness); setEditing(false); ST.toast(r.message, "success"); $(".side-user .u-name").text(r.profile.name); }
        catch (err) { ST.fail(err); }
        ST.busy($btn, false);
    });

    $("#pwForm").on("submit", async function (e) {
        e.preventDefault();
        const cur = $("#curPw").val(), n1 = $("#newPw").val(), n2 = $("#newPw2").val();
        if (!cur || !n1) return ST.toast("Fill in all password fields.", "error");
        if (n1.length < 8 || !/[A-Za-z]/.test(n1) || !/\d/.test(n1)) return ST.toast("Use at least 8 characters with a letter and a number.", "error");
        if (n1 !== n2) return ST.toast("The new passwords do not match.", "error");
        const $btn = $("#pwBtn"); ST.busy($btn, true, "Updating");
        try { const r = await ST.put("/api/profile/password", { currentPassword: cur, newPassword: n1 }); ST.toast(r.message, "success"); this.reset(); }
        catch (err) { ST.fail(err); }
        ST.busy($btn, false);
    });
});
