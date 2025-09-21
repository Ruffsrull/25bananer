document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("rsvp-form");
    var attendanceInput = document.getElementById("attendance");
    var submitBtn = form.querySelector(".submit-btn");
    var responseButtons = Array.prototype.slice.call(document.querySelectorAll(".response-btn"));
    var feedback = document.getElementById("feedback");
    var jumpscare = document.getElementById("jumpscare");
    var storageKey = "oktoberfest25-rsvp";
    var FORM_ENDPOINT = "https://formspree.io/f/xldprjdq";
    var jumpscareTimer = null;

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
    }

    function showJumpscare() {
        if (!jumpscare) {
            return;
        }
        jumpscare.classList.add("visible");
        jumpscare.setAttribute("aria-hidden", "false");
        if (jumpscareTimer) {
            clearTimeout(jumpscareTimer);
        }
        jumpscareTimer = setTimeout(hideJumpscare, 3200);
    }

    if (jumpscare) {
        jumpscare.addEventListener("click", hideJumpscare);
        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && jumpscare.classList.contains("visible")) {
                hideJumpscare();
            }
        });
    }

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

        var formData = {
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            message: form.message.value.trim(),
            attendance: attendanceInput.value,
            savedAt: new Date().toISOString()
        };

        if (!formData.attendance) {
            feedback.textContent = "Välj om du kommer eller inte innan du skickar.";
            return;
        }

        localStorage.setItem(storageKey, JSON.stringify(formData));

        submitBtn.disabled = true;
        submitBtn.textContent = "Skickar...";

        postSubmission(formData)
            .then(function () {
                feedback.textContent = formData.attendance === "accept"
                    ? "Jippie! Ditt svar är skickat och sparat på denna enhet."
                    : "Tack för beskedet. Jag har mottagit ditt svar.";
                showJumpscare();
            })
            .catch(function (error) {
                console.warn("RSVP kunde inte skickas", error);
                feedback.textContent = error.message || "Kunde inte skicka till värden just nu. Försök igen eller kontakta mig direkt.";
                hideJumpscare();
            })
            .finally(function () {
                submitBtn.disabled = false;
                submitBtn.textContent = "Skicka svar";
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
});
