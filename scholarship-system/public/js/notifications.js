$(async function () {
    await ST.initApp({ role: "student", active: "notifications", title: "Notifications" });
    let items = [], filter = "all";
    const ICON = { success: ["check-circle-fill", "i-leaf"], error: ["x-circle-fill", "i-rose"], warning: ["exclamation-triangle-fill", "i-amber"], info: ["info-circle-fill", "i-sky"] };

    const render = () => {
        const rows = items.filter(n => filter === "all" || !n.read);
        $("#noteList").html(rows.length ? rows.map(n => { const [ic, cl] = ICON[n.type] || ICON.info; return `
            <div class="note ${n.read ? "" : "unread"}" data-id="${n._id}" data-link="${ST.esc(n.link || "")}">
                <span class="n-icon ${cl}"><i class="bi bi-${ic}"></i></span>
                <div class="flex-grow-1"><div class="n-title">${ST.esc(n.title)}</div><div>${ST.esc(n.message)}</div><div class="n-time">${ST.timeAgo(n.createdAt)}</div></div>
                <button class="btn btn-sm btn-link text-muted align-self-start" data-del="${n._id}" aria-label="Delete notification"><i class="bi bi-x-lg"></i></button></div>`; }).join("")
            : ST.empty("bell-slash", filter === "unread" ? "No unread notifications" : "No notifications yet", "Updates about your applications will appear here."));
    };
    async function load() { try { const d = await ST.get("/api/notifications"); items = d.notifications; render(); ST.refreshUnread(); } catch (e) { ST.fail(e); } }

    $("[data-f]").on("click", function () { filter = $(this).data("f"); $("[data-f]").removeClass("btn-ink").addClass("btn-soft"); $(this).removeClass("btn-soft").addClass("btn-ink"); render(); });
    $("#readAll").on("click", async () => { try { await ST.put("/api/notifications/read-all"); items.forEach(n => n.read = true); render(); ST.refreshUnread(); } catch (e) { ST.fail(e); } });
    $("#noteList").on("click", "[data-del]", async function (e) {
        e.stopPropagation(); const id = $(this).data("del");
        try { await ST.del("/api/notifications/" + id); items = items.filter(n => n._id !== id); render(); ST.refreshUnread(); } catch (err) { ST.fail(err); }
    });
    $("#noteList").on("click", ".note", async function () {
        const id = $(this).data("id"), link = $(this).data("link"), n = items.find(x => x._id === id);
        if (n && !n.read) { try { await ST.put(`/api/notifications/${id}/read`); n.read = true; } catch (_) {} }
        if (link) location.href = link; else { render(); ST.refreshUnread(); }
    });
    load();
});
