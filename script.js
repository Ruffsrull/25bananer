document.addEventListener("DOMContentLoaded", function () {
    var countdownContainer = document.getElementById("countdown");
    var countdownMessage = document.getElementById("countdown-message");
    var countdownSrText = countdownContainer ? countdownContainer.querySelector("[data-countdown=\"sr-text\"]") : null;
    var countdownValues = countdownContainer ? {
        days: countdownContainer.querySelector("[data-countdown=\"days\"]"),
        hours: countdownContainer.querySelector("[data-countdown=\"hours\"]"),
        minutes: countdownContainer.querySelector("[data-countdown=\"minutes\"]"),
        seconds: countdownContainer.querySelector("[data-countdown=\"seconds\"]")
    } : null;
    if (countdownContainer && countdownValues && countdownValues.days && countdownValues.hours && countdownValues.minutes && countdownValues.seconds) {
        var countdownTarget = new Date("2025-10-25T00:00:00+02:00");
        if (isNaN(countdownTarget.getTime())) {
            countdownTarget = new Date("2025-10-25T00:00:00");
        }
        var countdownIntervalId = null;
        var FINISHED_MESSAGE = "Nu kör vi! Barnkalaset är igång.";
        function pad(value) {
            return value < 10 ? "0" + value : String(value);
        }
        function formatUnit(value, singular, plural) {
            return value + " " + (value === 1 ? singular : plural);
        }
        function formatAccessible(days, hours, minutes, seconds) {
            return formatUnit(days, "dag", "dagar") + ", " +
                formatUnit(hours, "timme", "timmar") + ", " +
                formatUnit(minutes, "minut", "minuter") + " och " +
                formatUnit(seconds, "sekund", "sekunder") + " kvar till barnkalaset.";
        }
        function updateCountdown() {
            var now = new Date();
            var distance = countdownTarget.getTime() - now.getTime();
            if (distance <= 0) {
                countdownValues.days.textContent = "0";
                countdownValues.hours.textContent = "00";
                countdownValues.minutes.textContent = "00";
                countdownValues.seconds.textContent = "00";
                if (countdownMessage) {
                    countdownMessage.textContent = FINISHED_MESSAGE;
                    countdownMessage.hidden = false;
                }
                countdownContainer.classList.add("countdown--finished");
                if (countdownSrText) {
                    countdownSrText.textContent = FINISHED_MESSAGE;
                }
                if (countdownIntervalId) {
                    clearInterval(countdownIntervalId);
                }
                return;
            }
            var totalSeconds = Math.floor(distance / 1000);
            var days = Math.floor(totalSeconds / 86400);
            var hours = Math.floor((totalSeconds % 86400) / 3600);
            var minutes = Math.floor((totalSeconds % 3600) / 60);
            var seconds = totalSeconds % 60;
            countdownValues.days.textContent = String(days);
            countdownValues.hours.textContent = pad(hours);
            countdownValues.minutes.textContent = pad(minutes);
            countdownValues.seconds.textContent = pad(seconds);
            if (countdownSrText) {
                countdownSrText.textContent = "Nedräkning till barnkalaset: " + formatAccessible(days, hours, minutes, seconds);
            }
        }
        updateCountdown();
        countdownIntervalId = setInterval(updateCountdown, 1000);
    }

    var form = document.getElementById("rsvp-form");
    if (!form) {
        return;
    }

    var attendanceInput = document.getElementById("attendance");
    var bringingPartnerSelect = document.getElementById("bringing-partner");
    var submitBtn = form.querySelector(".submit-btn");
    var responseButtons = Array.prototype.slice.call(document.querySelectorAll(".response-btn"));
    var formInputs = Array.prototype.slice.call(form.querySelectorAll("input, textarea, select"));
    var feedback = document.getElementById("feedback");
    var jumpscare = document.getElementById("jumpscare");
    var storageKey = "oktoberfest25-rsvp";
    var FORM_ENDPOINT = "https://formspree.io/f/xldprjdq";
    var jumpscareTimer = null;
    var jumpscareHideTimer = null;
    var recaptchaSiteKey = (form.dataset && form.dataset.recaptchaSitekey) || "";
    var recaptchaScriptInjected = false;
    var submissionCooldownKey = storageKey + "-submitted-at";
    var SUBMISSION_COOLDOWN_MS = 10 * 60 * 1000;
    var RECAPTCHA_ACTION = "rsvp_form_submit";

    if (jumpscare) {
        jumpscare.style.display = "none";
    }

    function setActiveResponse(value) {
        responseButtons.forEach(function (btn) {
            if (btn.dataset.response === value) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        attendanceInput.value = value;
        submitBtn.disabled = !value;
    }

    function finishHideJumpscare() {
        if (!jumpscare) {
            return;
        }
        jumpscare.style.display = "none";
        jumpscareHideTimer = null;
    }

    function hideJumpscare() {
        if (!jumpscare) {
            return;
        }
        jumpscare.classList.remove("visible");
        jumpscare.setAttribute("aria-hidden", "true");
        if (jumpscareTimer) {
            clearTimeout(jumpscareTimer);
            jumpscareTimer = null;
        }
        if (jumpscareHideTimer) {
            clearTimeout(jumpscareHideTimer);
        }
        jumpscareHideTimer = setTimeout(finishHideJumpscare, 260);
    }

    function showJumpscare() {
        if (!jumpscare) {
            return;
        }
        if (jumpscareHideTimer) {
            clearTimeout(jumpscareHideTimer);
            jumpscareHideTimer = null;
        }
        jumpscare.style.display = "flex";
        requestAnimationFrame(function () {
            jumpscare.classList.add("visible");
            jumpscare.setAttribute("aria-hidden", "false");
        });
        if (jumpscareTimer) {
            clearTimeout(jumpscareTimer);
        }
        jumpscareTimer = setTimeout(hideJumpscare, 6000);
    }

    if (jumpscare) {
        jumpscare.addEventListener("click", hideJumpscare);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && jumpscare.classList.contains("visible")) {
                hideJumpscare();
            }
        });
    }

    function injectRecaptchaScript() {
        if (!recaptchaSiteKey || recaptchaScriptInjected || window.grecaptcha) {
            return;
        }
        var script = document.createElement("script");
        script.src = "https://www.google.com/recaptcha/enterprise.js?render=" + encodeURIComponent(recaptchaSiteKey);
        script.async = true;
        script.defer = true;
        script.onerror = function () {
            console.warn("Kunde inte ladda reCAPTCHA-scriptet.");
        };
        document.head.appendChild(script);
        recaptchaScriptInjected = true;
    }

    function fetchRecaptchaToken(action) {
        if (!recaptchaSiteKey) {
            return Promise.resolve(null);
        }

        injectRecaptchaScript();

        return new Promise(function (resolve) {
            var attempts = 0;
            var maxAttempts = 40;

            function resolveWithoutToken(message) {
                if (message) {
                    console.warn(message);
                }
                resolve(null);
            }

            function executeWith(client) {
                client.ready(function () {
                    client.execute(recaptchaSiteKey, { action: action || "submit" })
                        .then(function (token) {
                            resolve(token);
                        })
                        .catch(function () {
                            resolveWithoutToken("Kunde inte verifiera reCAPTCHA. Fortsätter utan token.");
                        });
                });
            }

            function waitForRecaptcha() {
                attempts += 1;

                if (window.grecaptcha && window.grecaptcha.enterprise && typeof window.grecaptcha.enterprise.ready === "function") {
                    executeWith(window.grecaptcha.enterprise);
                    return;
                }

                if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
                    executeWith(window.grecaptcha);
                    return;
                }

                if (attempts >= maxAttempts) {
                    resolveWithoutToken("reCAPTCHA kunde inte laddas. Fortsätter utan verifiering.");
                    return;
                }

                setTimeout(waitForRecaptcha, 150);
            }

            waitForRecaptcha();
        });
    }

    function getRemainingCooldownMs() {
        var stored = Number(localStorage.getItem(submissionCooldownKey) || "0");
        if (!stored) {
            return 0;
        }
        var elapsed = Date.now() - stored;
        return elapsed < SUBMISSION_COOLDOWN_MS ? SUBMISSION_COOLDOWN_MS - elapsed : 0;
    }

    function setCooldownTimestamp(timestamp) {
        if (!timestamp) {
            localStorage.removeItem(submissionCooldownKey);
            return;
        }
        localStorage.setItem(submissionCooldownKey, String(timestamp));
    }

    function formatCooldownMessage(remainingMs) {
        var minutes = Math.ceil(remainingMs / 60000);
        if (minutes <= 1) {
            return "Vänligen vänta någon minut innan du skickar igen.";
        }
        return "Vänligen vänta ungeför " + minutes + " minuter innan du skickar igen.";
    }

    function lockFormAfterSubmission() {
        submitBtn.disabled = true;
        submitBtn.textContent = "Svar mottaget";
        responseButtons.forEach(function (btn) {
            btn.disabled = true;
        });
        formInputs.forEach(function (input) {
            if (input.type !== "hidden") {
                input.disabled = true;
            }
        });
    }

    function unlockFormForRetry() {
        submitBtn.disabled = false;
        submitBtn.textContent = "Skicka svar";
        responseButtons.forEach(function (btn) {
            btn.disabled = false;
        });
        formInputs.forEach(function (input) {
            if (input.type !== "hidden") {
                input.disabled = false;
            }
        });
    }

    injectRecaptchaScript();

    function postSubmission(data) {
        if (!FORM_ENDPOINT) {
            return Promise.reject(new Error("Form endpoint saknas"));
        }

        return fetch(FORM_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(data)
        }).then(function (response) {
            if (!response.ok) {
                return response.json().then(function (errorData) {
                    var message = (errorData && errorData.error) || "Misslyckades att skicka formuläret";
                    throw new Error(message);
                }).catch(function () {
                    throw new Error("Misslyckades att skicka formuläret");
                });
            }
            return response.json().catch(function () {
                return {};
            });
        });
    }

    responseButtons.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var choice = btn.dataset.response;
            setActiveResponse(choice);
            feedback.textContent = choice === "accept"
                ? "Toppen! Fyll i dina uppgifter och klicka på Skicka svar."
                : "Helt okej. Säg till om planerna ändras!";
        });
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        var remainingCooldown = getRemainingCooldownMs();
        if (remainingCooldown > 0) {
            feedback.textContent = formatCooldownMessage(remainingCooldown);
            return;
        }

        var formData = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            message: form.message.value.trim(),
            attendance: attendanceInput.value,
            bringingPartner: bringingPartnerSelect ? bringingPartnerSelect.value : "",
            savedAt: new Date().toISOString()
        };

        if (!formData.attendance) {
            feedback.textContent = "Välj om du kommer eller inte innan du skickar.";
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify(formData));

        submitBtn.disabled = true;
        submitBtn.textContent = "Skickar...";

        var submissionCompleted = false;

        fetchRecaptchaToken(RECAPTCHA_ACTION)
            .then(function (token) {
                if (token) {
                    formData["g-recaptcha-response"] = token;
                }
                return postSubmission(formData);
            })
            .then(function () {
                submissionCompleted = true;
                setCooldownTimestamp(Date.now());
                lockFormAfterSubmission();
                feedback.textContent = formData.attendance === "accept"
                    ? "Jippie! Ditt svar är skickat och sparat på denna enhet."
                    : "Tack för beskedet. Jag har mottagit ditt svar.";
                showJumpscare();
            })
            .catch(function (error) {
                console.warn("RSVP kunde inte skickas", error);
                feedback.textContent = error.message || "Kunde inte skicka till världen just nu. Försök igen eller kontakta mig direkt.";
                hideJumpscare();
                unlockFormForRetry();
            })
            .finally(function () {
                if (!submissionCompleted) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Skicka svar";
                }
            });
    });

    try {
        var saved = localStorage.getItem(storageKey);
        if (saved) {
            var data = JSON.parse(saved);
            if (data.name) {
                form.name.value = data.name;
            }
            if (data.email) {
                form.email.value = data.email;
            }
            if (data.message) {
                form.message.value = data.message;
            }
            if (bringingPartnerSelect && data.bringingPartner) {
                bringingPartnerSelect.value = data.bringingPartner;
            }
            if (data.attendance) {
                setActiveResponse(data.attendance);
                feedback.textContent = data.attendance === "accept"
                    ? "Kul att du är tillbaka! Du är anmäld som kommer."
                    : "Kul att du är tillbaka! Du är anmäld som förhindrad.";
            }
        }
    } catch (error) {
        console.warn("Kunde inte läsa sparat svar", error);
        localStorage.removeItem(storageKey);
    }

    var initialCooldown = getRemainingCooldownMs();
    if (initialCooldown > 0) {
        lockFormAfterSubmission();
        if (feedback) {
            feedback.textContent = formatCooldownMessage(initialCooldown);
        }
    }
});






























