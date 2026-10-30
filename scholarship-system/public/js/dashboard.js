$(async function () {
    const user = await ST.initApp({ role: "student", active: "dashboard", title: "Dashboard" });
    const first = user.name.split(" ")[0];
    try {
        const [s, prof] = await Promise.all([ST.get("/api/applications/summary/me"), ST.get("/api/profile")]);

        const hasApps = s.total > 0;
        $("#welcome").html(`<div class="row align-items-center g-3"><div class="col-lg-8">
            <h2>Welcome back, ${ST.esc(first)}</h2>
            <p>${hasApps ? `You have ${s.pending} application${s.pending === 1 ? "" : "s"} in progress and ${s.available} scholarship${s.available === 1 ? "" : "s"} open for applications.` : `${s.available} scholarship${s.available === 1 ? " is" : "s are"} open right now. Pick one that fits your profile and apply in a few minutes.`}</p></div>
            <div class="col-lg-4 text-lg-end"><a class="btn btn-gold btn-lg" href="/scholarships.html">Find scholarships</a></div></div>`);

        $("#kAvail").text(s.available); $("#kTotal").text(s.total); $("#kPending").text(s.pending); $("#kApproved").text(s.approved); $("#kRejected").text(s.rejected);

        if (s.actionNeeded.length) {
            $("#actionAlert").html(`<div class="alert alert-warning d-flex gap-3 align-items-start mb-4"><i class="bi bi-exclamation-triangle-fill fs-5"></i><div>
                <strong>Action needed.</strong> ${s.actionNeeded.length === 1 ? "One application needs" : s.actionNeeded.length + " applications need"} additional documents:
                ${s.actionNeeded.map(a => `<a class="fw-semibold" href="/tracking.html?id=${a._id}">${ST.esc(a.scholarship)}</a>`).join(", ")}.</div></div>`);
        }

        $("#recent").html(s.recent.length ? `<table class="table table-hover"><thead><tr><th>Scholarship</th><th>Applied on</th><th>Status</th><th class="text-end">Action</th></tr></thead><tbody>${
            s.recent.map(a => `<tr><td><div class="cell-main">${ST.esc(a.scholarship)}</div><div class="cell-sub">${ST.esc(a.applicationNo)} · ${ST.inr(a.amount)}</div></td><td>${ST.date(a.createdAt)}</td><td>${ST.statusBadge(a.status)}</td>
            <td class="text-end"><a class="btn btn-soft btn-sm" href="/tracking.html?id=${a._id}">Track</a></td></tr>`).join("")}</tbody></table>`
            : ST.empty("send", "No applications yet", "When you apply for a scholarship, you can follow its progress here.", '<a class="btn btn-primary" href="/scholarships.html">Find scholarships</a>'));

        $("#closing").html(s.upcoming.length ? s.upcoming.map(x => `<a href="/scholarship-details.html?id=${x._id}" class="d-flex justify-content-between align-items-center gap-3 p-3 rounded text-reset" style="border-bottom:1px solid var(--line)">
            <div class="overflow-hidden"><div class="cell-main text-truncate">${ST.esc(x.name)}</div><div class="cell-sub">${ST.inr(x.amount)}</div></div>${ST.deadlineHTML(x)}</a>`).join("")
            : ST.empty("calendar-check", "Nothing closing soon", "You have applied to every open scholarship, or none are open."));

        const pc = prof.completeness;
        $("#profileCard").html(`<div class="d-flex justify-content-between fw-semibold mb-2"><span>Profile completeness</span><span>${pc}%</span></div><div class="meter mb-2"><span style="width:${pc}%"></span></div>
            <p class="small text-muted mb-3">${pc < 100 ? "Complete your profile to get accurate eligibility checks." : "Your profile is complete."}</p><a class="btn btn-soft btn-sm" href="/profile.html">${pc < 100 ? "Complete profile" : "View profile"}</a>`);
    } catch (e) { ST.fail(e); }
});
