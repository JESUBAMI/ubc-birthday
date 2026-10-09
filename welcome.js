(function () {
    const welcome = document.getElementById("welcome");
    if (!welcome) return;

    function open() {
        welcome.removeEventListener("click", open);
        document.removeEventListener("keydown", onKey);
        welcome.classList.add("leaving");
        document.body.classList.remove("intro");
        window.setTimeout(function () { welcome.remove(); }, 600);
    }

    function onKey(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open();
        }
    }

    welcome.addEventListener("click", open);
    document.addEventListener("keydown", onKey);
})();