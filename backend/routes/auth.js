const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const Company = require("../models/Company");
const Application = require("../models/Application");
const { requireAuth, JWT_SECRET } = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role, accountType, organizationCode } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        // Normalize roles for backward compatibility
        let normalizedRole = role;
        if (role === "student") normalizedRole = "STUDENT";
        if (role === "admin") normalizedRole = "PLACEMENT_OFFICER";

        const validRoles = ["STUDENT", "PLACEMENT_OFFICER", "RECRUITER", "SUPER_ADMIN"];
        if (!validRoles.includes(normalizedRole)) {
            return res.status(400).json({ message: "Invalid role specified." });
        }

        // Normalize account type
        let normalizedAccountType = accountType || "ORGANIZATION"; // Default to organization
        if (normalizedRole === "RECRUITER") {
            normalizedAccountType = "INDIVIDUAL";
        }

        // Restrict public registration of SUPER_ADMIN
        if (normalizedRole === "SUPER_ADMIN") {
            const adminSecret = req.headers["x-super-admin-secret"];
            if (!adminSecret || adminSecret !== process.env.SUPER_ADMIN_SECRET) {
                return res.status(403).json({ message: "Super Admin registration is restricted." });
            }
        }

        let organizationId = null;

        if (normalizedAccountType === "ORGANIZATION") {
            if (!organizationCode) {
                return res.status(400).json({
                    message: "Organization registration code is required for college student/officer registration."
                });
            }

            const org = await Organization.findOne({ organizationCode });
            if (!org) {
                return res.status(400).json({ message: "Invalid organization registration code." });
            }
            if (org.status !== "ACTIVE") {
                return res.status(400).json({ message: "This organization is currently inactive." });
            }
            organizationId = org._id;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: normalizedRole,
            accountType: normalizedAccountType,
            organizationId,
            isActive: true
        });

        await user.save();

        // Generate JWT Token automatically on signup
        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                accountType: user.accountType,
                organizationId: user.organizationId ? user.organizationId.toString() : null
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountType: user.accountType,
                organizationId: user.organizationId,
                phone: user.phone || "",
                branch: user.branch || "",
                cgpa: user.cgpa || 0,
                resume: user.resume || "",
                linkedin: user.linkedin || "",
                github: user.github || "",
                skills: user.skills || []
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Registration failed",
            error: error.message
        });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Normalize role for database query
        let normalizedRole = role;
        if (role === "student") normalizedRole = "STUDENT";
        if (role === "admin") normalizedRole = "PLACEMENT_OFFICER";

        const user = await User.findOne({ email, role: normalizedRole });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or role"
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                message: "Your account is inactive. Please contact the administrator."
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        // Generate JWT Token
        const token = jwt.sign(
            {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
                accountType: user.accountType,
                organizationId: user.organizationId ? user.organizationId.toString() : null
            },
            JWT_SECRET,
            { expiresIn: "24h" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                accountType: user.accountType,
                organizationId: user.organizationId,
                phone: user.phone || "",
                branch: user.branch || "",
                cgpa: user.cgpa || 0,
                resume: user.resume || "",
                linkedin: user.linkedin || "",
                github: user.github || "",
                skills: user.skills || []
            }
        });

    } catch (error) {
        res.status(500).json({
            message: "Login failed",
            error: error.message
        });
    }
});

// Get user profile
router.get("/profile/:userId", requireAuth, async (req, res) => {
    try {
        const requester = req.user;
        const targetUserId = req.params.userId;

        // Check permissions
        if (requester.role === "SUPER_ADMIN" || requester.id === targetUserId) {
            // Authorized
        } else if (requester.role === "PLACEMENT_OFFICER") {
            const targetUser = await User.findById(targetUserId);
            if (!targetUser || targetUser.organizationId?.toString() !== requester.organizationId) {
                return res.status(403).json({ message: "Access denied. Student is not in your organization." });
            }
        } else if (requester.role === "RECRUITER") {
            // Recruiter can only view students who applied to their jobs
            const recruiterJobs = await Company.find({ createdBy: requester.id }, "_id");
            const jobIds = recruiterJobs.map(j => j._id);
            const application = await Application.findOne({ student: targetUserId, company: { $in: jobIds } });
            if (!application) {
                return res.status(403).json({ message: "Access denied. Student has not applied to your jobs." });
            }
        } else {
            return res.status(403).json({ message: "Access denied." });
        }

        const user = await User.findById(targetUserId).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json(user);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get profile",
            error: error.message
        });
    }
});

// Update user profile
router.put("/profile/:userId", requireAuth, async (req, res) => {
    try {
        const requester = req.user;
        const targetUserId = req.params.userId;

        // Only the user themselves or Super Admin can update their profile
        if (requester.id !== targetUserId && requester.role !== "SUPER_ADMIN") {
            return res.status(403).json({ message: "Access denied. Cannot update another user's profile." });
        }

        const { phone, branch, cgpa, resume, skills, linkedin, github } = req.body;

        const user = await User.findByIdAndUpdate(
            targetUserId,
            { phone, branch, cgpa, resume, skills, linkedin, github },
            { new: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        res.json({
            message: "Profile updated successfully",
            user
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to update profile",
            error: error.message
        });
    }
});

// Multer configuration for Resume uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, "../uploads");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, req.user.id + "-" + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === "application/pdf") {
            cb(null, true);
        } else {
            cb(new Error("Only PDF files are allowed!"), false);
        }
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit
});

// Upload resume PDF endpoint
router.post("/upload-resume", requireAuth, upload.single("resume"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded." });
        }
        const fileUrl = `/uploads/${req.file.filename}`;
        res.json({
            message: "Resume PDF uploaded successfully",
            fileUrl
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;