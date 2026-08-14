const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dns = require("dns");
const path = require("path");

require("dotenv").config();

// DNS servers
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const authRoutes = require("./routes/auth");
const companyRoutes = require("./routes/companies");
const studentRoutes = require("./routes/students");
const notificationRoutes = require("./routes/notifications");

const app = express();
const frontendPath = path.join(__dirname, "..", "frontend");

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(frontendPath));

// Home route
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Authentication routes
app.use("/api/auth", authRoutes);

// Company and Application routes
app.use("/api/companies", companyRoutes);

// Student routes
app.use("/api/students", studentRoutes);

// Notification routes
app.use("/api/notifications", notificationRoutes);

const PORT = process.env.PORT || 5000;

// Start the API first so frontend requests can reach the server even if Atlas is unavailable.
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");
    })
    .catch((error) => {
        console.log("MongoDB Connection Error:", error.message);
    });
