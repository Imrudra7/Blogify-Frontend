document.addEventListener("DOMContentLoaded", () => {
    let BASE_URL;

    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {

        BASE_URL = "http://localhost:8081"; // local backend
    } else {
        BASE_URL = "https://blogify-bk6w.onrender.com"; // render backend
    }


    const submitPost = document.getElementById("submitButton");
    const loadPosts = document.getElementById("loadPosts");
    const homeLink = Array.from(document.querySelectorAll('nav li')).find(li => li.textContent === 'Home');

    const postsContainer = document.querySelector('.loadAllPostsContainer');

    if (homeLink) {
        homeLink.addEventListener('click', () => {
            window.location.href = '/index.html';
        });
    }
    if (submitPost) {
        submitPost.addEventListener("click", async (e) => {
            e.preventDefault();

            const content = document.getElementById("content").value;

            if (content) {
                const title = prompt("Title:");
                const authorName = prompt("Author Name:");

                if (title && authorName) {

                    try {
                        const url = `${BASE_URL}/api/posts/createPost`;
                        const response = await fetch(url, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify(
                                {
                                    title: title,
                                    author: authorName,
                                    content: content
                                }
                            )
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log("✅ Post Created Successfully.", data);
                            document.getElementById("content").value = "";
                        } else {
                            console.log("❌ Something went wrong", await response.text());
                        }
                    } catch (err) {
                        console.error("⚠️ Error:", err);
                    }
                } else {
                    console.log("No author or title provided");
                }
            }
        });
    }

    if (loadPosts) {
        loadPosts.addEventListener('click', async () => {
            const response = await fetch(`${BASE_URL}/api/posts/getAllPosts`);


            if (response) {
                try {


                    if (!response.ok) {
                        console.log("❌ Failed to fetch posts:", response.status);
                        return;
                    }

                    const posts = await response.json(); // yahan array milega

                    if (posts.length > 0) {
                        console.log(`✅ ${posts.length} posts found:`, posts);
                        setPostData(posts);
                    } else {
                        console.log("⚠️ No posts found");
                    }

                } catch (error) {
                    console.error("⚠️ Error fetching posts:", error);
                }
            }
        });
    }
    function setPostData(list) {
        const loadDiv = document.querySelector('.loadAllPostsContainer');

        if (loadDiv) {


            loadDiv.innerHTML = "";

            for (let index = 0; index < list.length; index++) {
                const element = list[index];
                const postDiv = document.createElement("div");
                postDiv.classList.add("newPost");
                postDiv.dataset.id = element.id;
                const formattedDate = new Date(element.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                postDiv.innerHTML = `
                                <h2 class="postTitle">${element.title}</h2>
                                <p class="postContent">${element.content}</p>
                                <p class="postAuthor">Author: ${element.author}</p>
                                <p class="postStatus">Status: ${element.status}</p>
                                <p class="postCreatedAt">Created At: ${formattedDate}</p>
                                `;
                loadDiv.appendChild(postDiv);
            }
        }
    }

    if (postsContainer) {
        postsContainer.addEventListener('click', (event) => {

            const clickedPost = event.target.closest('.newPost');

            if (clickedPost) {
                const postId = clickedPost.dataset.id;
                console.log(`Post clicked! Navigating to post with ID: ${postId}`);
                window.location.href = `post-detail.html?id=${postId}`;
            }
        });
    }
});
