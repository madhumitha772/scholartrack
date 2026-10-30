$(function () {
    ST.togglePassword();

    $("#forgotForm").on("submit", async function (e) {
        e.preventDefault(); $("#formError").addClass("d-none");
        const email = $("#email").val().trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) return $("#formError").text("Enter a valid email address.").removeClass("d-none");
        const $btn = $("#forgotBtn"); ST.busy($btn, true, "Generating");
        try {
            const res = await ST.post("/api/auth/forgot-password", { email });
            let html = `<div class="alert ${res.deliveryWarning ? "alert-warning" : "alert-success"} mb-0"><i class="bi bi-${res.deliveryWarning ? "exclamation-triangle" : "check-circle"} me-1"></i>${ST.esc(res.message)}${res.deliveryWarning ? `<div class="mt-2">${ST.esc(res.deliveryWarning)}</div>` : ""}</div>`;
            if (res.devResetLink) {
                html += `<div class="hint-box mt-3"><strong>Development mode:</strong> no email server is connected, so the link is shown here and printed in the server console.<br>
                    <a class="btn btn-gold btn-sm mt-2" href="${ST.esc(res.devResetLink)}">Open reset link</a></div>`;
            }
            $("#forgotResult").html(html).removeClass("d-none");
        } catch (err) { $("#formError").text(err.message).removeClass("d-none"); }
        ST.busy($btn, false);
    });

    $("#resetForm").on("submit", async function (e) {
        e.preventDefault(); $("#formError").addClass("d-none");
        const token = ST.query("token"), pw = $("#password").val(), confirm = $("#confirmPassword").val();
        const show = (m) => $("#formError").text(m).removeClass("d-none");
        if (!token) return show("This reset link is incomplete. Request a new one.");
        if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return show("Use at least 8 characters with a letter and a number.");
        if (pw !== confirm) return show("The two passwords do not match.");
        const $btn = $("#resetBtn"); ST.busy($btn, true, "Updating");
        try {
            await ST.post("/api/auth/reset-password", { token, password: pw });
            ST.toast("Password updated. Redirecting to log in.", "success");
            setTimeout(() => location.href = "/login.html", 1400);
        } catch (err) { show(err.message); ST.busy($btn, false); }
    });
});
