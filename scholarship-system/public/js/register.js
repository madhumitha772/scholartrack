$(async function () {
    ST.togglePassword(); ST.fillCommon();
    if (await ST.me()) { location.replace("/dashboard.html"); return; }
    $("#dob").attr("max", new Date().toISOString().slice(0, 10));

    const rules = {
        name: v => v.trim().length >= 2,
        email: v => /^\S+@\S+\.\S+$/.test(v.trim()),
        password: v => v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v),
        confirmPassword: v => v === $("#password").val() && v.length > 0,
        phone: v => /^[0-9+\-\s]{10,15}$/.test(v.trim()),
        dob: v => !!v && new Date(v) < new Date(),
        gender: v => !!v, state: v => !!v, address: v => v.trim().length >= 5, college: v => v.trim().length >= 2, department: v => v.trim().length >= 2, course: v => v.trim().length >= 1,
        year: v => !!v, category: v => !!v,
        cgpa: v => v !== "" && Number(v) >= 0 && Number(v) <= 10,
        familyIncome: v => v !== "" && Number(v) >= 0
    };
    const check = (name) => { const $f = $("#" + name); if (!$f.length) return true; const ok = rules[name](String($f.val() ?? "")); $f.toggleClass("is-invalid", !ok); return ok; };
    Object.keys(rules).forEach(n => $("#" + n).on("blur change", () => check(n)));
    $("#password").on("input", () => { if ($("#confirmPassword").val()) check("confirmPassword"); });

    // ----- step 2: e-mail code -----
    let pendingEmail = "", timer = null;
    const showVerifyError = (m) => $("#verifyError").text(m).removeClass("d-none");
    function countdown(seconds) {
        clearInterval(timer);
        const $r = $("#resendBtn");
        const tick = () => { if (seconds <= 0) { clearInterval(timer); $r.prop("disabled", false).text("Resend code"); } else { $r.prop("disabled", true).text(`Resend code in ${seconds}s`); seconds--; } };
        tick(); timer = setInterval(tick, 1000);
    }
    function openVerify(email, wait) {
        pendingEmail = email;
        $("#verifyEmail").text(email); $("#verifyCode").val(""); $("#verifyError").addClass("d-none");
        $("#registerStage").addClass("d-none"); $("#verifyStage").removeClass("d-none");
        countdown(wait || 30); $("#verifyCode").trigger("focus");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    function backToForm(message) {
        clearInterval(timer);
        $("#verifyStage").addClass("d-none"); $("#registerStage").removeClass("d-none");
        if (message) $("#formError").text(message).removeClass("d-none");
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    $("#registerForm").on("submit", async function (e) {
        e.preventDefault(); $("#formError").addClass("d-none");
        const valid = Object.keys(rules).map(check).every(Boolean);
        if (!valid) { $(".is-invalid").first().trigger("focus"); return $("#formError").text("Please correct the highlighted fields.").removeClass("d-none"); }
        const data = {}; Object.keys(rules).forEach(n => data[n] = String($("#" + n).val() ?? ""));
        const $btn = $("#registerBtn"); ST.busy($btn, true, "Sending code");
        try {
            const r = await ST.post("/api/auth/register", data);
            openVerify(r.email || data.email.trim().toLowerCase(), r.resendAfter);
            ST.toast(r.message, "success");
        } catch (err) {
            $("#formError").text(err.message).removeClass("d-none");
            if (/email/i.test(err.message)) { $("#email").addClass("is-invalid").trigger("focus"); }
        }
        ST.busy($btn, false);
    });

    $("#verifyCode").on("input", function () { this.value = this.value.replace(/\D/g, "").slice(0, 6); if (this.value.length === 6) $("#verifyBtn").trigger("click"); });
    $("#verifyBtn").on("click", async function () {
        const code = $("#verifyCode").val();
        $("#verifyError").addClass("d-none");
        if (!/^\d{6}$/.test(code)) return showVerifyError("Enter the 6-digit code from the email.");
        const $btn = $(this); if ($btn.prop("disabled")) return; ST.busy($btn, true, "Verifying");
        try {
            const r = await ST.post("/api/auth/register/verify", { email: pendingEmail, code });
            try { sessionStorage.setItem("st_flash", r.message); } catch (_) {}
            location.href = "/dashboard.html"; return;
        } catch (err) {
            showVerifyError(err.message);
            ST.busy($btn, false);
            if (/expired|start again/i.test(err.message)) return backToForm(err.message);
            return;
        }
        ST.busy($btn, false);
    });
    $("#resendBtn").on("click", async function () {
        $("#verifyError").addClass("d-none");
        try { const r = await ST.post("/api/auth/register/resend", { email: pendingEmail }); countdown(r.resendAfter || 30); ST.toast(r.message, "success"); }
        catch (err) { showVerifyError(err.message); if (/expired|fill in the form|could not send|does not exist/i.test(err.message)) backToForm(err.message); }
    });
    $("#changeEmailBtn").on("click", () => backToForm());
});
