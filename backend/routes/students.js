const express = require("express");
const User = require("../models/User");

const router = express.Router();

// Get all students (admin)
router.get("/", async (req, res) => {
    try {
        const students = await User.find({ role: "student" })
            .select("-password")
            .sort({ createdAt: -1 });

        res.json(students);

    } catch (error) {
        res.status(500).json({
            message: "Failed to get students",
            error: error.message
        });
    }
});

module.exports = router;
