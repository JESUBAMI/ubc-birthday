const form = document.getElementById("birthdayForm");
const message = document.getElementById("message");

function setMessage(text, type) {
    message.textContent = text;
    message.className = type;
}

form.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!window.CHURCH_BIRTHDAY_API_URL) {
        setMessage("The online registry is not connected yet. Ask the site administrator to finish the Google Sheets setup.", "error");
        return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const month = document.getElementById("month").value;
    const day = Number(document.getElementById("day").value);
    const phone = document.getElementById("phone").value.trim();
    const unit = document.getElementById("unit").value;
    const daysByMonth = {
        January: 31,
        February: 29,
        March: 31,
        April: 30,
        May: 31,
        June: 30,
        July: 31,
        August: 31,
        September: 30,
        October: 31,
        November: 30,
        December: 31
    };

    if (!fullName) {
        setMessage("Please enter your full name.", "error");
        return;
    }

    if (!month) {
        setMessage("Please select your birth month.", "error");
        return;
    }

    if (!Number.isInteger(day) || day < 1 || day > daysByMonth[month]) {
        setMessage("Please enter a valid day for the selected month.", "error");
        return;
    }

    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Sending...";
    setMessage("", "");

    try {
        await window.ChurchBirthdayApi.post({
            action: "submit",
            fullName: fullName,
            month: month,
            day: String(day),
            phone: phone,
            unit: unit,
            website: document.getElementById("website").value
        });

        window.location.href = "thank-you.html?name=" + encodeURIComponent(fullName);
    } catch (error) {
        setMessage(error.message, "error");
        button.disabled = false;
        button.textContent = "Send to Secretary";
    }
});