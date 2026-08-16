// ========== Toast notification system ==========
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

// ========== Ripple Effect on Buttons ==========
function addRippleEffect(element) {
    element.addEventListener("click", function (e) {
        const ripple = document.createElement("span");
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + "px";
        ripple.style.left = x + "px";
        ripple.style.top = y + "px";
        ripple.classList.add("ripple");

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
}

// ========== Parallax Scroll Effect ==========
function initParallax() {
    const parallaxElements = document.querySelectorAll("[data-parallax]");
    
    window.addEventListener("scroll", () => {
        parallaxElements.forEach((el) => {
            const scrollPosition = window.scrollY;
            const speed = el.dataset.parallax || 0.5;
            el.style.transform = `translateY(${scrollPosition * speed}px)`;
        });
    });
}

// ========== Smooth Scroll to Sections ==========
function smoothScrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

// ========== Form Input Focus Animation ==========
function initFormInputs() {
    const inputs = document.querySelectorAll(".form-input, .form-select");
    
    inputs.forEach((input) => {
        input.addEventListener("focus", function () {
            this.parentElement.style.transform = "scale(1.02)";
        });
        
        input.addEventListener("blur", function () {
            this.parentElement.style.transform = "scale(1)";
        });
    });
}

// ========== Lazy Load Images ==========
function initLazyLoad() {
    const images = document.querySelectorAll("[data-src]");
    
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.add("loaded");
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach((img) => observer.observe(img));
}

// ========== Count Animation ==========
function animateCounter(element, target, duration = 2000) {
    if (isNaN(target)) return;
    
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const counter = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target;
            clearInterval(counter);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// ========== Type Writer Effect ==========
function typeWriter(element, text, speed = 50) {
    element.innerHTML = "";
    let index = 0;
    
    function type() {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// ========== Scroll Animation ==========
function initScrollAnimations() {
    const elements = document.querySelectorAll("[data-scroll-animation]");
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const animation = entry.target.dataset.scrollAnimation;
                entry.target.style.animation = animation + " 0.6s ease forwards";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach((el) => observer.observe(el));
}

// ========== Confetti Effect ==========
function triggerConfetti(duration = 2000) {
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9999";
    document.body.appendChild(canvas);
    
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const colors = ["#8c5b2b", "#9b6b2f", "#e4c285", "#b77d33"];
    
    for (let i = 0; i < 50; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: -10,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 3 + 2,
            size: Math.random() * 5 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
        });
    }
    
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach((p, index) => {
            p.y += p.vy;
            p.x += p.vx;
            p.vy += 0.1;
            
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size);
            
            if (p.y > canvas.height) {
                particles.splice(index, 1);
            }
        });
        
        if (particles.length > 0) {
            requestAnimationFrame(animate);
        } else {
            canvas.remove();
        }
    }
    
    animate();
    
    setTimeout(() => {
        if (canvas.parentElement) canvas.remove();
    }, duration);
}

// ========== Shake Effect ==========
function shakeElement(element, distance = 5, duration = 500) {
    const originalX = element.style.transform || "translateX(0)";
    const start = Date.now();
    
    function shake() {
        const elapsed = Date.now() - start;
        const progress = elapsed / duration;
        
        if (progress < 1) {
            const offset = Math.sin(progress * Math.PI * 6) * distance;
            element.style.transform = `translateX(${offset}px)`;
            requestAnimationFrame(shake);
        } else {
            element.style.transform = originalX;
        }
    }
    
    shake();
}

// ========== Hover Lift Effect ==========
function addHoverLiftEffect(element) {
    element.addEventListener("mouseenter", function () {
        this.style.transform = "translateY(-8px)";
        this.style.boxShadow = "0 12px 30px rgba(139, 91, 43, 0.2)";
    });
    
    element.addEventListener("mouseleave", function () {
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.1)";
    });
}

const API_BASE_URL = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000"
    : "https://placement-management-backend-x5mq.onrender.com";

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
        shakeElement(document.querySelector(".auth-card"));
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            message.style.color = "#10b981";
            message.textContent = "✓ Login successful! Redirecting...";
            triggerConfetti();

            localStorage.setItem("user", JSON.stringify(data.user));
            localStorage.setItem("token", data.token); // Store JWT securely

            setTimeout(() => {
                const normRole = role.toUpperCase();
                if (normRole === "STUDENT") {
                    window.location.href = "student-dashboard.html";
                } else if (normRole === "PLACEMENT_OFFICER") {
                    window.location.href = "admin-dashboard.html";
                } else if (normRole === "RECRUITER") {
                    window.location.href = "recruiter-dashboard.html";
                } else if (normRole === "SUPER_ADMIN") {
                    window.location.href = "super-admin-dashboard.html";
                } else {
                    // Fallback for any old mappings
                    window.location.href = "index.html";
                }
            }, 1500);

        } else {
            message.style.color = "#ef4444";
            message.textContent = data.message || "Login failed.";
            shakeElement(document.querySelector(".auth-card"));
        }

    } catch (error) {
        console.error(error);
        message.style.color = "#ef4444";
        message.textContent = "Cannot connect to server.";
        shakeElement(document.querySelector(".auth-card"));
    }
});

// Toggle Password Visibility
const passwordInput = document.getElementById("password");
const passwordToggle = document.getElementById("passwordToggle");

if (passwordInput && passwordToggle) {
    passwordToggle.addEventListener("click", () => {
        const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
        passwordInput.setAttribute("type", type);
        passwordToggle.textContent = type === "password" ? "👁️" : "🙈";
        passwordToggle.style.animation = "wiggle 0.4s ease";
        setTimeout(() => {
            passwordToggle.style.animation = "";
        }, 400);
    });
}

// ========== Initialize Effects ==========
document.addEventListener("DOMContentLoaded", function () {
    // Add ripple effects to all buttons
    document.querySelectorAll("button").forEach((btn) => {
        addRippleEffect(btn);
    });
    
    // Initialize form inputs
    initFormInputs();
    
    // Initialize lazy loading
    initLazyLoad();
    
    // Initialize scroll animations
    initScrollAnimations();
    
    // Initialize parallax
    initParallax();
    
    // Add hover lift effects to cards
    document.querySelectorAll(".stat-card, .company-card, .glass-card").forEach((card) => {
        addHoverLiftEffect(card);
    });
    
    // Add smooth scroll behavior
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const target = this.getAttribute("href").slice(1);
            smoothScrollToSection(target);
        });
    });
    
    showToast("Welcome to Placement Management System!", "info");
});