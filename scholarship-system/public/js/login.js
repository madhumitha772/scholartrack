$(async function () {
    ST.togglePassword();
    const existing = await ST.me();
    if (existing) { location.replace(ST.safeNext(existing.role === "admin" ? "/admin/dashboard.html" : "/dashboard.html")); return; }

    const showError = (msg) => $("#formError").text(msg).removeClass("d-none");
    $("#loginForm").on("submit", async function (e) {
        e.preventDefault();
        $("#formError").addClass("d-none");
        const email = $("#email").val().trim(), password = $("#password").val();
        if (!email || !password) return showError("Enter your email and password.");
        const $btn = $("#loginBtn"); ST.busy($btn, true, "Logging in");
        try {
            const res = await ST.post("/api/auth/login", { email, password });
            const home = res.user.role === "admin" ? "/admin/dashboard.html" : "/dashboard.html";
            let next = ST.safeNext(home);
            if (res.user.role === "admin" && !next.startsWith("/admin")) next = home;
            if (res.user.role === "student" && next.startsWith("/admin")) next = home;
            location.href = next;
        } catch (err) { showError(err.message); ST.busy($btn, false); }
    });
});
