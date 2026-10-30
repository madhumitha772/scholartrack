$(async function () {
    ST.togglePassword();
    const existing = await ST.me();
    if (existing && existing.role === "admin") { location.replace(ST.safeNext("/admin/dashboard.html").startsWith("/admin") ? ST.safeNext("/admin/dashboard.html") : "/admin/dashboard.html"); return; }

    const showError = (msg) => $("#formError").text(msg).removeClass("d-none");
    $("#loginForm").on("submit", async function (e) {
        e.preventDefault();
        $("#formError").addClass("d-none");
        const email = $("#email").val().trim(), password = $("#password").val();
        if (!email || !password) return showError("Enter your email and password.");
        const $btn = $("#loginBtn"); ST.busy($btn, true, "Logging in");
        try {
            // Dedicated admin endpoint: the server signs in administrators only, and never a student account.
            const res = await ST.post("/api/auth/admin/login", { email, password });
            if (!res.user || res.user.role !== "admin") throw new Error("Invalid administrator email or password.");
            const next = ST.safeNext("/admin/dashboard.html");
            location.href = next.startsWith("/admin") ? next : "/admin/dashboard.html";
        } catch (err) { showError(err.message); ST.busy($btn, false); }
    });
});
