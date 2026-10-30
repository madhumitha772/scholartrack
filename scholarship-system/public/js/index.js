$(async function () {
    ST.publicNav("home"); ST.publicFooter();

    $("#heroTracker").html(ST.trackerHTML({
        status: "Under Review",
        history: [
            { status: "Submitted", at: new Date(Date.now() - 6 * 86400000) },
            { status: "Under Review", at: new Date(Date.now() - 3 * 86400000) }
        ]
    }));

    try {
        const list = await ST.get("/api/scholarships", { open: "true", sort: "deadline" });
        $("#openList").html(list.length
            ? list.slice(0, 3).map(ST.scholarshipCard).join("")
            : `<div class="col-12">${ST.empty("award", "No scholarships are open right now", "New scholarships appear here as soon as they are published.")}</div>`);
    } catch (e) {
        $("#openList").html(`<div class="col-12">${ST.empty("wifi-off", "Could not load scholarships", e.message)}</div>`);
    }
});
