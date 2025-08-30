document.addEventListener("DOMContentLoaded", () => {
    let BASE_URL;

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        BASE_URL = "http://localhost:8081/api/dsa"; // local backend
    } else {
        BASE_URL = "https://blogify-bk6w.onrender.com/api/dsa"; // render backend
    }

    const sectionsContainer = document.getElementById("sections-container");

    async function loadAllQuestions() {
        try {
            const response = await fetch(`${BASE_URL}/loadAllQuestions`);
            if (!response.ok) {
                throw new Error(`Failed to load questions: ${response.status}`);
            }

            const questions = await response.json();

            // group questions by section + difficulty
            const grouped = {};
            questions.forEach(q => {
                if (!grouped[q.section]) grouped[q.section] = { Easy: [], Medium: [], Hard: [] };
                grouped[q.section][q.difficulty].push(q);
            });

            if (sectionsContainer)
                sectionsContainer.innerHTML = "";

            // render each section
            Object.entries(grouped).forEach(([sectionName, difficulties]) => {
                const sectionEl = document.createElement("section");
                sectionEl.classList.add("dsa-section");

                sectionEl.innerHTML = `<h2 class="section-title">${sectionName}</h2>`;

                const difficultiesContainer = document.createElement("div");
                difficultiesContainer.classList.add("difficulty-accordions");

                ["Easy", "Medium", "Hard"].forEach(diff => {
                    if (difficulties[diff].length > 0) {
                        const detailsEl = document.createElement("details");
                        detailsEl.classList.add("difficulty-details");

                        const summaryEl = document.createElement("summary");
                        summaryEl.classList.add("difficulty-summary", diff.toLowerCase());
                        summaryEl.textContent = diff;

                        const questionsList = document.createElement("div");
                        questionsList.classList.add("questions-list");

                        difficulties[diff].forEach(q => {
                            const qItem = document.createElement("div");
                            qItem.classList.add("question-item");

                            qItem.innerHTML = `
                                <input type="checkbox" class="question-check" ${q.done ? "checked" : ""} data-id="${q.id}"/>
                                <p class="question-name">${q.name}</p>
                                <div class="question-links">
                                    ${q.questionLink.map(l => `<a href="${l}" target="_blank">Link</a>`).join(" ")}
                                </div>
                            `;

                            questionsList.appendChild(qItem);
                        });

                        detailsEl.appendChild(summaryEl);
                        detailsEl.appendChild(questionsList);
                        difficultiesContainer.appendChild(detailsEl);
                    }
                });

                sectionEl.appendChild(difficultiesContainer);
                if (sectionsContainer)
                    sectionsContainer.appendChild(sectionEl);
            });
            if (sectionsContainer) {
                sectionsContainer.addEventListener("change", function (e) {
                    if (e.target && e.target.classList.contains("question-check")) {
                        const id = e.target.dataset.id;
                        const checked = e.target.checked;

                        // style update bhi turant karo
                        const nameEl = e.target.closest(".question-item").querySelector(".question-name");
                        if (nameEl) {
                            if (checked) nameEl.classList.add("done");
                            else nameEl.classList.remove("done");
                        }

                        // backend update
                        fetch(`${BASE_URL}/updateSelection`, {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                id: id,
                                done: checked
                            })
                        }).then((response) => {
                            if(!response.ok)
                                throw new error(response);
                            return response.json();
                        }).then(data=>alert(data.message)).catch(err => console.error("Update failed:", err));
                    }
                });
            }
        } catch (err) {
            console.error("Error:", err);
            if (sectionsContainer)
                sectionsContainer.innerHTML = `<p style="color:red;">Failed to load questions.</p>`;
        }
    }

    // initial call
    loadAllQuestions();
    if (document.getElementById("questionForm"))
        document.getElementById("questionForm").addEventListener("submit", async function (e) {
            e.preventDefault();

            const name = document.getElementById("name").value.trim();
            const links = document.getElementById("questionLink").value
                .split(",")
                .map(link => link.trim())
                .filter(link => link !== "");
            const difficulty = document.getElementById("difficulty").value;
            const section = document.getElementById("section").value.trim();

            const questionData = {
                name: name,
                questionLink: links,
                difficulty: difficulty,
                section: section
            };

            console.log("Final JSON:", questionData);

            try {
                const res = await fetch(`${BASE_URL}/addNewQuestion`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(questionData)
                });
                const data = await res.json();
                //console.log(data);


                if (res.status == '201') {
                    document.getElementById("message").innerText = "✅ " + data.message;
                    document.getElementById("message").style.color = "green";
                    document.getElementById("questionForm").reset();
                } else {
                    document.getElementById("message").innerText = "❌ Failed to add question.";
                    document.getElementById("message").style.color = "red";
                }
            } catch (error) {
                console.log(error);

                document.getElementById("message").innerText = "⚠️ Error connecting to server!";
                document.getElementById("message").style.color = "red";
            }
        });
});
