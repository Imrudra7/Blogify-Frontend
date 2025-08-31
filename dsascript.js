document.addEventListener("DOMContentLoaded", () => {
    // --- 1. CONFIGURATION & STATE ---
    let BASE_URL;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        BASE_URL = "http://localhost:8081/api/dsa"; // Local backend
    } else {
        BASE_URL = "https://blogify-bk6w.onrender.com/api/dsa"; // Deployed backend
    }
    const token = localStorage.getItem('authToken');
    let userStr = localStorage.getItem("user");


    let userObj = JSON.parse(userStr);


    const CURRENT_USER_EMAIL = userObj?.sub ?? null;

    // --- 2. DOM ELEMENT REFERENCES ---
    const sectionsContainer = document.getElementById("sections-container");
    const questionForm = document.getElementById("questionForm");
    const messageEl = document.getElementById("message");

    // --- 3. API LAYER (Functions for all backend communication) ---

    /**
     * Fetches all questions from the backend.
     * @returns {Promise<Array>} A promise that resolves to the array of questions.
     */
    async function fetchAllQuestions() {
        const response = await fetch(`${BASE_URL}/loadAllQuestions`);
        if (!response.ok) throw new Error(`Failed to load questions: ${response.status}`);
        return response.json();
    }

    /**
     * Updates the 'done' status of a question for a user.
     * @param {string} questionId - The ID of the question to update.
     * @param {boolean} isDone - The new completion status.
     * @returns {Promise<Object>} A promise that resolves to the server's response.
     */
    async function updateQuestionStatus(questionId, isDone) {
        if (localStorage.getItem('authToken') && CURRENT_USER_EMAIL) {


            const response = await fetch(`${BASE_URL}/updateSelection`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: CURRENT_USER_EMAIL,
                    questionToBeAddedOrRemoved: questionId,
                    addOrRemove: isDone ? "Add" : "Remove"
                }),
            });
            if (!response.ok) throw new Error(await response.message());
            return response.json();
        }
    }

    /**
     * Adds a new question to the database via the form.
     * @param {Object} questionData - The data for the new question.
     * @returns {Promise<Object>} A promise that resolves to the server's response.
     */
    async function addNewQuestion(questionData) {
        const response = await fetch(`${BASE_URL}/addNewQuestion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(questionData)
        });
        if (!response.ok) throw new Error('Failed to add question');
        return response.json();
    }


    // --- 4. UI RENDERING LAYER (Functions to build HTML) ---

    /**
     * Groups questions by section and difficulty.
     * @param {Array} questions - The flat array of questions.
     * @returns {Object} A nested object of grouped questions.
     */
    function groupQuestions(questions) {
        return questions.reduce((acc, q) => {
            const { section, difficulty } = q;
            if (!acc[section]) acc[section] = { Easy: [], Medium: [], Hard: [] };
            acc[section][difficulty].push(q);
            return acc;
        }, {});
    }

    /**
     * Renders the entire UI from the grouped question data.
     * @param {Object} groupedData - The grouped question data.
     */
    function renderUI(groupedData) {
        const allSectionsHTML = Object.entries(groupedData).map(([sectionName, difficulties]) => {
            const difficultiesHTML = ["Easy", "Medium", "Hard"].map(diff =>
                difficulties[diff].length > 0 ? renderDifficultyAccordion(diff, difficulties[diff]) : ""
            ).join("");

            return `
                <section class="dsa-section">
                    <h2 class="section-title">${sectionName}</h2>
                    <div class="difficulty-accordions">${difficultiesHTML}</div>
                </section>
            `;
        }).join("");

        sectionsContainer.innerHTML = allSectionsHTML;
    }

    function renderDifficultyAccordion(diff, questions) {
        const questionsHTML = questions.map(renderQuestionItem).join("");
        return `
            <details class="difficulty-details">
                <summary class="difficulty-summary ${diff.toLowerCase()}">${diff}</summary>
                <div class="questions-list">${questionsHTML}</div>
            </details>
        `;
    }

    function renderQuestionItem(q) {
        return `
            <div class="question-item">
                <input type="checkbox" class="question-check" ${q.done ? "checked" : ""} data-id="${q.id}"/>
                <p class="question-name">${q.name}</p>
                <div class="question-links">
                    ${q.questionLink.map(l => `<a href="${l}" target="_blank">Link</a>`).join(" ")}
                </div>
            </div>
        `;
    }

    // --- 5. EVENT HANDLERS & INITIALIZATION ---

    /**
     * Handles checkbox changes using event delegation.
     */
    async function handleCheckboxChange(event) {
        if (!event.target.classList.contains("question-check")) return;

        const checkbox = event.target;
        const questionItem = checkbox.closest(".question-item");
        const questionId = checkbox.dataset.id;
        const isDone = checkbox.checked;

        questionItem.classList.add("loading"); // Immediate visual feedback

        try {

            if (!token) {
                showToast("Please login first!", "error");
                checkbox.checked = !isDone;
                return;
            }
            const data = await updateQuestionStatus(questionId, isDone);
            showToast(data.message || "Progress updated!", "success");

            alert(data.message);
            const nameEl = questionItem.querySelector(".question-name");
            nameEl.classList.toggle("done", isDone);
        } catch (err) {
            showToast("Update failed. Please try again.", "error");
            checkbox.checked = !isDone; // Revert checkbox on failure
        } finally {
            questionItem.classList.remove("loading");
        }
    }

    /**
     * Handles the form submission for adding a new question.
     */
    async function handleFormSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const questionData = {
            name: formData.get("name").trim(),
            questionLink: formData.get("questionLink").split(",").map(link => link.trim()).filter(Boolean),
            difficulty: formData.get("difficulty"),
            section: formData.get("section").trim(),
        };

        try {
            const data = await addNewQuestion(questionData);
            showToast(data.message || "✅ Question added successfully!", "success");
            event.target.reset();
            // Refresh the entire list to show the new question
            loadAndRenderAllQuestions();
        } catch (error) {
            showToast("❌ Failed to add question.", "error");
        }
    }

    /**
     * Main function to fetch data and render the UI.
     */
    async function loadAndRenderAllQuestions() {
        try {
            sectionsContainer.innerHTML = `<p>Loading questions...</p>`;
            const questions = await fetchAllQuestions();
            renderUI(groupQuestions(questions));
            token ? applyUserProgress(token) : null;
        } catch (err) {
            console.error("Fatal Error:", err);
            sectionsContainer.innerHTML = `<p style="color:red;">Failed to load questions.</p>`;
        }
    }

    /**
     * A simple utility for non-blocking notifications.
     */
    function showToast(message, type = "info") {
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.style.color = type === "error" ? "red" : "green";
        }
        // For a real app, use a proper toast library
        console.log(`[${type.toUpperCase()}] ${message}`);
    }

    // --- 6. INITIALIZE THE APPLICATION ---

    // Attach event listeners ONCE
    if (sectionsContainer) {
        sectionsContainer.addEventListener("change", handleCheckboxChange);
    }
    if (questionForm) {
        questionForm.addEventListener("submit", handleFormSubmit);
    }
    /**
     * Fetches user-specific progress (which questions are done)
     * and applies checkbox states accordingly.
     */
    async function applyUserProgress(token) {


        try {

            const response = await fetch(`${BASE_URL}/getUserSelections`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error("Failed to fetch user selections");

            const data = await response.json();
            const selectedIds = data.object ?? [];


            document.querySelectorAll(".question-check").forEach(cb => {
                const qId = cb.dataset.id.toString().trim();
                cb.checked = selectedIds.includes(qId);

                const nameEl = cb.closest(".question-item").querySelector(".question-name");
                nameEl.classList.toggle("done", cb.checked);
            });

            console.log("User progress applied:", selectedIds);
        } catch (err) {
            console.error("Error syncing user progress:", err);
        }
    }

    // Initial data load
    loadAndRenderAllQuestions();
});