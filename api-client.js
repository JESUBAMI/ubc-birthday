(function () {
    const frameName = "birthdayApiFrame";
    const KEY_NAME = "churchBirthdaySecretaryKey";

    // The key is kept only for this browser tab. Closing the tab forgets it.
    function readStoredKey() {
        try { return window.sessionStorage.getItem(KEY_NAME) || ""; } catch (error) { return ""; }
    }

    function storeKey(value) {
        try {
            if (value) window.sessionStorage.setItem(KEY_NAME, value);
            else window.sessionStorage.removeItem(KEY_NAME);
        } catch (error) { /* storage unavailable: the key is asked for each visit */ }
    }

    let secretaryKey = readStoredKey();

    function requireApiUrl() {
        if (!window.CHURCH_BIRTHDAY_API_URL) {
            throw new Error("The online registry is not connected. Check that backend-config.js contains the web app URL.");
        }
        return window.CHURCH_BIRTHDAY_API_URL;
    }

    function getSecretaryKey() {
        if (!secretaryKey) {
            secretaryKey = window.prompt("Enter the secretary access key:");
            if (secretaryKey) storeKey(secretaryKey);
        }
        if (!secretaryKey) {
            throw new Error("The secretary access key is required.");
        }
        return secretaryKey;
    }

    function post(values) {
        const url = requireApiUrl();
        const requestId = Array.from(crypto.getRandomValues(new Uint8Array(12)), function (b) {
            return b.toString(16).padStart(2, "0");
        }).join("");
        return new Promise(function (resolve, reject) {
            let frame = document.querySelector(`iframe[name="${frameName}"]`);
            if (!frame) {
                frame = document.createElement("iframe");
                frame.name = frameName;
                frame.title = "Birthday registry response";
                frame.hidden = true;
                document.body.appendChild(frame);
            }

            let postForm;
            const timeout = window.setTimeout(function () {
                finish();
                reject(new Error("The server did not respond. Check the web app URL and try again."));
            }, 20000);

            function finish() {
                window.clearTimeout(timeout);
                window.removeEventListener("message", onMessage);
                if (postForm) postForm.remove();
            }

            function onMessage(event) {
                if (!event.data ||
                    event.data.type !== "church-birthday-api" ||
                    event.data.requestId !== requestId) {
                    return;
                }

                finish();
                if (event.data.payload.success) {
                    resolve(event.data.payload);
                } else {
                    if (/access denied/i.test(event.data.payload.error || "")) {
                        secretaryKey = "";
                        storeKey("");
                    }
                    reject(new Error(event.data.payload.error || "The request could not be completed."));
                }
            }

            window.addEventListener("message", onMessage);
            postForm = document.createElement("form");
            postForm.method = "POST";
            postForm.action = url;
            postForm.target = frameName;
            postForm.hidden = true;

            Object.entries(Object.assign({ requestId: requestId }, values)).forEach(function ([name, value]) {
                const input = document.createElement("input");
                input.type = "hidden";
                input.name = name;
                input.value = value;
                postForm.appendChild(input);
            });

            document.body.appendChild(postForm);
            postForm.submit();
        });
    }

    function listEntries() {
        return post({ action: "list", adminKey: getSecretaryKey() }).then(function (payload) {
            return payload.result;
        });
    }

    function lock() {
        secretaryKey = "";
        storeKey("");
    }

    window.ChurchBirthdayApi = {
        post: post,
        listEntries: listEntries,
        getSecretaryKey: getSecretaryKey,
        lock: lock
    };
})();