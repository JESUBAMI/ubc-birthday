const monthMap = {
    January: 0,
    February: 1,
    March: 2,
    April: 3,
    May: 4,
    June: 5,
    July: 6,
    August: 7,
    September: 8,
    October: 9,
    November: 10,
    December: 11
};

function getBirthdaySortValue(entry) {
    return (monthMap[entry.month] ?? 0) * 100 + (Number(entry.day) || 1);
}

function compareEntries(a, b) {
    const statusWeight = { pending: 0, approved: 1 };
    const statusCompare = (statusWeight[a.status] ?? 99) - (statusWeight[b.status] ?? 99);
    return statusCompare || getBirthdaySortValue(a) - getBirthdaySortValue(b);
}

function getThisWeekEntries(entries) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return entries.filter(entry => {
        if (entry.status !== "approved") return false;
        const birthday = new Date(
            start.getFullYear(),
            monthMap[entry.month] ?? 0,
            Number(entry.day) || 1
        );
        if (birthday < start) birthday.setFullYear(start.getFullYear() + 1);
        return birthday >= start && birthday < end;
    });
}

function updateBulletin(entries) {
    // The bulletin is printed on Sunday and covers Sunday to Saturday of the coming week.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() + (7 - start.getDay()));
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const last = new Date(end);
    last.setDate(last.getDate() - 1);
    const format = date => date.toLocaleDateString("en-GB", { day: "numeric", month: "long" });

    const items = [];
    entries.forEach(entry => {
        if (entry.status !== "approved") return;
        const month = monthMap[entry.month];
        const day = Number(entry.day);
        if (month === undefined || !day) return;
        const date = new Date(start.getFullYear(), month, day);
        if (date < start) date.setFullYear(start.getFullYear() + 1);
        if (date >= start && date < end) items.push({ date: date, name: entry.fullName });
    });
    items.sort((a, b) => a.date - b.date);

    document.getElementById("bulletinRange").textContent =
        "For the bulletin of " + format(start) + " (covers " + format(start) + " to " + format(last) + ")";
    document.getElementById("bulletinText").textContent = items.length
        ? items.map(item => item.name + " – " + format(item.date)).join("\n")
        : "No approved birthdays for this bulletin yet.";
}

function updateStats(entries) {
    document.getElementById("totalRecords").textContent = String(entries.length);
    document.getElementById("approvedCount").textContent = String(
        entries.filter(entry => entry.status === "approved").length
    );
    const pendingTotal = entries.filter(entry => entry.status === "pending").length;
    document.getElementById("pendingCount").textContent = String(pendingTotal);

    const approveAll = document.getElementById("approveAll");
    approveAll.textContent = pendingTotal ? "Approve all (" + pendingTotal + ")" : "Nothing to approve";
    approveAll.disabled = !pendingTotal;

    document.getElementById("thisWeekCount").textContent = String(getThisWeekEntries(entries).length);
}

function updateSpotlight(entries) {
    const spotlightEntries = getThisWeekEntries(entries)
        .sort((a, b) => getBirthdaySortValue(a) - getBirthdaySortValue(b));

    if (!spotlightEntries.length) {
        document.getElementById("spotlightName").textContent = "No approved birthdays this week";
        document.getElementById("spotlightDate").textContent = "Approved members with birthdays this week appear here";
        document.getElementById("spotlightUnit").textContent = "—";
        return;
    }

    document.getElementById("spotlightName").textContent =
        spotlightEntries.map(entry => entry.fullName).join(", ");
    document.getElementById("spotlightDate").textContent =
        spotlightEntries.map(entry => `${entry.month} ${entry.day}`).join(" · ");
    document.getElementById("spotlightUnit").textContent =
        spotlightEntries.map(entry => entry.unit || "General Member").join(" · ");
}

function formatSubmittedDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

function addCell(row, text, className) {
    const cell = document.createElement("span");
    cell.textContent = text;
    if (className) cell.className = className;
    row.appendChild(cell);
    return cell;
}

function addActionButton(container, label, action, entryId, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.className = `action-btn ${className}`;
    button.dataset.action = action;
    button.dataset.id = entryId;
    container.appendChild(button);
}

function renderTable(entries) {
    const tableBody = document.getElementById("entriesTableBody");
    const emptyState = document.getElementById("emptyState");
    tableBody.replaceChildren();
    emptyState.style.display = entries.length ? "none" : "block";

    entries.slice().sort(compareEntries).forEach(entry => {
        const row = document.createElement("div");
        row.className = "row";
        addCell(row, entry.fullName, "name-cell");
        addCell(row, entry.month);
        addCell(row, String(entry.day));
        addCell(row, entry.phone || "—");
        addCell(row, entry.unit || "Not specified");

        const statusCell = document.createElement("span");
        statusCell.className = "status-wrap";
        const badge = document.createElement("span");
        badge.className = `badge ${entry.status}`;
        badge.textContent = entry.status;
        statusCell.appendChild(badge);
        row.appendChild(statusCell);

        addCell(row, formatSubmittedDate(entry.createdAt));
        const actions = document.createElement("span");
        actions.className = "actions";
        if (entry.status !== "approved") {
            addActionButton(actions, "Approve", "approved", entry.id, "approve");
        }
        addActionButton(actions, "Delete", "delete", entry.id, "delete");
        row.appendChild(actions);
        tableBody.appendChild(row);
    });
}

async function loadDashboard() {
    const message = document.getElementById("dashboardMessage");
    message.textContent = "Loading records from Google Sheets...";
    message.className = "dashboard-message";

    try {
        const entries = await window.ChurchBirthdayApi.listEntries();
        updateStats(entries);
        updateSpotlight(entries);
        updateBulletin(entries);
        renderTable(entries);
        message.textContent = "";
    } catch (error) {
        document.getElementById("totalRecords").textContent = "—";
        document.getElementById("approvedCount").textContent = "—";
        document.getElementById("pendingCount").textContent = "—";
        document.getElementById("thisWeekCount").textContent = "—";
        document.getElementById("spotlightName").textContent = "Registry unavailable";
        document.getElementById("spotlightDate").textContent = "Connect the deployed Google Sheet to load records";
        document.getElementById("spotlightUnit").textContent = "—";
        document.getElementById("bulletinText").textContent = "Unavailable until the registry loads.";
        message.textContent = error.message;
        message.className = "dashboard-message error";
    }
}

document.addEventListener("click", async function (event) {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;
    if (!id) return;

    if (action === "delete" && !window.confirm("Delete this birthday record permanently?")) {
        return;
    }

    const message = document.getElementById("dashboardMessage");
    button.disabled = true;
    message.textContent = "Saving...";
    message.className = "dashboard-message";

    try {
        const adminKey = window.ChurchBirthdayApi.getSecretaryKey();
        await window.ChurchBirthdayApi.post({
            action: action === "delete" ? "delete" : "status",
            id: id,
            status: action,
            adminKey: adminKey
        });
        await loadDashboard();
    } catch (error) {
        message.textContent = error.message;
        message.className = "dashboard-message error";
        button.disabled = false;
    }
});

document.getElementById("refreshEntries").addEventListener("click", loadDashboard);
window.addEventListener("DOMContentLoaded", loadDashboard);

document.getElementById("copyBulletin").addEventListener("click", async function () {
    const button = this;
    try {
        await navigator.clipboard.writeText(document.getElementById("bulletinText").textContent);
        button.textContent = "Copied!";
    } catch (error) {
        button.textContent = "Select the text and press Ctrl+C";
    }
    window.setTimeout(function () { button.textContent = "Copy list"; }, 2500);
});
document.getElementById("approveAll").addEventListener("click", async function () {
    const button = this;
    const message = document.getElementById("dashboardMessage");
    if (!window.confirm("Approve all new names? Approved names can appear in the bulletin list.")) return;

    button.disabled = true;
    message.textContent = "Approving...";
    message.className = "dashboard-message";

    try {
        await window.ChurchBirthdayApi.post({
            action: "approveAll",
            adminKey: window.ChurchBirthdayApi.getSecretaryKey()
        });
        await loadDashboard();
    } catch (error) {
        message.textContent = error.message;
        message.className = "dashboard-message error";
        button.disabled = false;
    }
});