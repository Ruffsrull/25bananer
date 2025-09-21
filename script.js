document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("rsvp-form");
    var attendanceInput = document.getElementById("attendance");
    var submitBtn = form.querySelector(".submit-btn");
    var responseButtons = Array.prototype.slice.call(document.querySelectorAll(".response-btn"));
    var feedback = document.getElementById("feedback");
    var storageKey = "oktoberfest25-rsvp";
    var FORM_ENDPOINT = "https://formspree.io/f/xldprjdq"; // Ersätt med ditt riktiga Formspree-ID

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

    function postSubmission(data) {
        if (!FORM_ENDPOINT || FORM_ENDPOINT.indexOf("yourFormId") !== -1) {
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
                throw new Error("Misslyckades att skicka formuläret");
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
                : "Tråkigt att du inte kan komma. Hör av dig om något ändras!";
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
            })
            .catch(function (error) {
                console.warn("RSVP kunde inte skickas", error);
                feedback.textContent = "Kunde inte skicka till värden just nu. Försök igen eller kontakta mig direkt.";
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

