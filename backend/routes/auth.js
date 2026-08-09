const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role
        });

        await user.save();

        res.status(201).json({
            message: "Registration successful"
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

        const user = await User.findOne({ email, role });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or role"
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }

        res.json({
            message: "Login successful",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone || "",
                branch: user.branch || "",
                cgpa: user.cgpa || 0,
                resume: user.resume || "",
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
router.get("/profile/:userId", async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select("-password");

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
router.put("/profile/:userId", async (req, res) => {
    try {
        const { phone, branch, cgpa, resume, skills } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            { phone, branch, cgpa, resume, skills },
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

module.exports = router;