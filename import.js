(function () {
    const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
        "August", "September", "October", "November", "December"];
    const UNITS = ["Adult Choir", "Anti-Abortion Crusaders", "Choreography Unit", "Counseling Unit",
        "Drama Ministry", "Evangelism Unit", "Hospital Evangelism", "Instrumentalists",
        "Internet Evangelism", "Interpreters Unit", "Juvenile Choir", "Life Choice",
        "Ministry Comedians", "Outreach Ministry", "Prayer Department", "Priesthood Mass Choir",
        "Puppeteers", "Sunday School (Bible Teachers)", "Ushering Department",
        "Visitation Unit", "Welfare Unit"];
    const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";

    function monthIndex(text) {
        const t = text.slice(0, 3).toLowerCase();
        return MONTHS.findIndex(function (m) { return m.slice(0, 3).toLowerCase() === t; });
    }

    function titleCase(text) {
        return text.toLowerCase().replace(/(^|[\s'\-])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); });
    }

    function extractDate(line) {
        let m = new RegExp("\\b(\\d{1,2})(?:st|nd|rd|th)?[\\s,]*(?:of\\s+)?" + MONTH_RE + "\\b", "i").exec(line);
        if (m) return { day: Number(m[1]), month: monthIndex(m[2]), text: m[0] };
        m = new RegExp("\\b" + MONTH_RE + "\\b\\.?[\\s,]*(\\d{1,2})(?:st|nd|rd|th)?\\b", "i").exec(line);
        if (m) return { day: Number(m[2]), month: monthIndex(m[1]), text: m[0] };
        m = /\b(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*\d{2,4})?\b/.exec(line);
        if (m) {
            const a = Number(m[1]);
            const b = Number(m[2]);
            // Day first (14/03), unless the first number cannot be a day-of-month swap (03/14).
            return a <= 12 && b > 12 ? { day: b, month: a - 1, text: m[0] } : { day: a, month: b - 1, text: m[0] };
        }
        return null;
    }

    function findUnit(segment) {
        const t = segment.toLowerCase().replace(/\s+/g, " ").trim();
        const exact = UNITS.filter(function (u) { return u.toLowerCase() === t; });
        if (exact.length) return exact[0];
        const partial = UNITS.filter(function (u) { return t.length >= 5 && u.toLowerCase().indexOf(t) !== -1; });
        return partial.length === 1 ? partial[0] : null;
    }

    function parseLine(raw) {
        const line = raw.replace(/^\s*\d+[.)]\s+/, "").replace(/\t/g, ",").trim();
        if (!line) return null;

        const date = extractDate(line);
        if (!date) return { raw: raw, error: "No birthday date found" };
        if (!(date.month >= 0 && date.month <= 11) ||
            !(date.day >= 1 && date.day <= new Date(2024, date.month + 1, 0).getDate())) {
            return { raw: raw, error: "That date is not valid" };
        }

        let rest = line.replace(date.text, ",");
        let phone = "";
        const p = /\+?\d[\d\s\-]{6,}\d/.exec(rest);
        if (p && p[0].replace(/\D/g, "").length >= 7) {
            phone = p[0].replace(/\s+/g, " ").trim();
            rest = rest.replace(p[0], ",");
        }
        rest = rest.replace(/\b(19|20)\d{2}\b/g, ",");

        const parts = rest.split(/[,;|]|\s[-–—]\s/)
            .map(function (s) { return s.replace(/\s+/g, " ").replace(/^[\s.:\-]+|[\s.:\-]+$/g, ""); })
            .filter(function (s) { return /[A-Za-z]/.test(s); });

        let name = "";
        let unit = "";
        parts.forEach(function (part) {
            const known = findUnit(part);
            if (known && !unit) unit = known;
            else if (!name) name = part;
            else if (!unit) unit = part;
        });

        if (!name) return { raw: raw, error: "No name found" };
        if (name === name.toUpperCase()) name = titleCase(name);
        if (name.length > 120 || unit.length > 80) return { raw: raw, error: "Text is too long" };

        return { raw: raw, entry: { fullName: name, month: MONTHS[date.month], day: date.day, phone: phone, unit: unit } };
    }

    function parseList(text) {
        const seen = {};
        return text.split(/\r?\n/).map(parseLine).filter(Boolean).map(function (item) {
            if (item.entry) {
                const key = item.entry.fullName.toLowerCase() + "|" + item.entry.month + "|" + item.entry.day;
                if (seen[key]) return { raw: item.raw, error: "Appears twice in this list" };
                seen[key] = true;
            }
            return item;
        });
    }

    window.ChurchImportParser = { parseList: parseList };

    const textArea = document.getElementById("importText");
    if (!textArea) return;

    const checkButton = document.getElementById("checkImport");
    const runButton = document.getElementById("runImport");
    const preview = document.getElementById("importPreview");
    const message = document.getElementById("importMessage");
    let ready = [];

    function addRow(text, className) {
        const row = document.createElement("div");
        row.className = "import-row " + className;
        row.textContent = text;
        preview.appendChild(row);
    }

    checkButton.addEventListener("click", function () {
        const items = parseList(textArea.value);
        preview.replaceChildren();
        ready = items.filter(function (i) { return i.entry; }).map(function (i) { return i.entry; });
        const bad = items.filter(function (i) { return i.error; });

        message.className = "dashboard-message";
        message.textContent = items.length
            ? ready.length + " ready to import, " + bad.length + " need attention."
            : "Paste or type the list first.";

        bad.forEach(function (i) { addRow(i.raw.trim() + "  —  " + i.error, "bad"); });
        ready.forEach(function (e) {
            addRow(e.fullName + "  —  " + e.day + " " + e.month + (e.unit ? "  —  " + e.unit : ""), "ok");
        });

        runButton.textContent = ready.length ? "Import " + ready.length + " names" : "Import";
        runButton.disabled = !ready.length;
    });

    textArea.addEventListener("input", function () {
        ready = [];
        runButton.disabled = true;
        runButton.textContent = "Import";
    });

    runButton.addEventListener("click", async function () {
        if (!ready.length) return;
        if (!window.confirm("Import " + ready.length + " names as approved?")) return;

        runButton.disabled = true;
        message.className = "dashboard-message";
        message.textContent = "Importing...";

        try {
            const response = await window.ChurchBirthdayApi.post({
                action: "import",
                adminKey: window.ChurchBirthdayApi.getSecretaryKey(),
                entries: JSON.stringify(ready)
            });
            message.textContent = "Done: " + response.result.added + " added, " +
                response.result.skipped + " skipped (already registered).";
            textArea.value = "";
            preview.replaceChildren();
            ready = [];
            runButton.textContent = "Import";
            await loadDashboard();
        } catch (error) {
            message.textContent = error.message;
            message.className = "dashboard-message error";
            runButton.disabled = false;
        }
    });
})();