// Toast notification system
function showToast(message, type = "info") {
    let container = document.querySelector(".toast-container");
    if (!container) {
        container = document.createElement("div");
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = { success: "✓", error: "✕", info: "ℹ" };
    toast.innerHTML = `<span>${icons[type] || "ℹ"}</span><span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("hiding");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Login form handler
document.getElementById("loginForm").addEventListener("submit", async function (event) {
    event.preventDefault();

    const role = document.getElementById("role").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    if (!role || !email || !password) {
        message.style.color = "#ef4444";
        message.textContent = "Please fill all fields.";
        return;
    }

    try {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "#10b981";
            message.textContent = "✓ Login successful! Redirecting...";

            localStorage.setItem("user", JSON.stringify(data.user));

            setTimeout(() => {
                if (role === "student") {
                    window.location.href = "student-dashboard.html";
                } else {
                    window.location.href = "admin-dashboard.html";
                }
            }, 1000);

        } else {
            message.style.color = "#ef4444";
            message.textContent = data.message || "Login failed.";
        }

    } catch (error) {
        console.error(error);
        message.style.color = "#ef4444";
        message.textContent = "Cannot connect to server.";
    }
});